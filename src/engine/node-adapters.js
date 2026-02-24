/**
 * Runtime Hub - Node Adapters
 * Standalone executor functions for every node type.
 *
 * Signature: async function execute*(node, workflow, connections, inputs = {})
 *
 * Nodes that need socket I/O use workflow.io  (Socket.IO server instance).
 * Nodes that need EventEmitter events use workflow.emitFn(event, data).
 * The Loop node uses workflow.traverseNode(targetNode, connections) for traversal.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Constants for magic numbers
const PROCESS_TIMEOUT_MS = 30000; // 30 second timeout for child processes
const PROCESS_TERMINATE_DELAY_MS = 1000; // 1 second delay before force kill

// ─── CONTROL FLOW ─────────────────────────────────────────────────────────────

async function executeStart(node, workflow, connections, inputs = {}) {
    console.log('🚀 Workflow started');
    return { message: 'Workflow execution started' };
}

async function executeEnd(node, workflow, connections, inputs = {}) {
    console.log('🏁 Workflow completed');
    return { message: 'Workflow execution completed' };
}

async function executeCondition(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const condition = config.condition || '';
    const operator = config.operator || 'equals';
    const value = config.value || '';

    let result = false;
    switch (operator) {
        case 'equals':     result = condition === value; break;
        case 'not_equals': result = condition !== value; break;
        case 'contains':   result = condition.includes(value); break;
        default:           result = false;
    }

    // _nextPort tells executeConnectedNodes which output branch to follow
    return { result, branch: result ? 'true' : 'false', _nextPort: result ? 'true' : 'false' };
}

async function executeDelay(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const duration = config.duration || 1000;
    const unit = config.unit || 'ms';

    let waitTime = duration;
    if (unit === 'seconds') waitTime *= 1000;
    else if (unit === 'minutes') waitTime *= 60000;

    console.log(`⏱️ Waiting ${duration} ${unit}`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    return { duration: waitTime, unit, completed: true };
}

async function executeWait(node, workflow, connections, inputs = {}) {
    // Alias for Delay
    return executeDelay(node, workflow, connections, inputs);
}

async function executeLoop(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const iterations = Math.max(1, parseInt(config.iterations) || 1);
    const delayBetween = parseInt(config.delayBetween) || 0;

    console.log(`🔄 Looping ${iterations} times`);

    const results = [];
    for (let i = 0; i < iterations; i++) {
        if (workflow.cancelled) break;
        console.log(`🔄 Loop iteration ${i + 1}/${iterations}`);

        const connectedConnections = connections.filter(c => c.from.nodeId === node.id);
        for (const conn of connectedConnections) {
            const targetNode = workflow.nodeMap ? workflow.nodeMap.get(conn.to.nodeId) : null;
            if (targetNode) {
                // Use workflow.traverseNode set by the engine
                const result = await workflow.traverseNode(targetNode, connections);
                results.push({ iteration: i + 1, nodeId: targetNode.id, result });
            }
        }

        if (delayBetween > 0 && i < iterations - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }

    // _skipAutoTraverse: loop manages its own traversal above
    return { success: true, iterations, completed: results.length, results, _skipAutoTraverse: true };
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

async function executeShowMessage(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const title = inputs.title !== undefined ? String(inputs.title) : (config.title || 'Notification');
    const rawMessage = inputs.message !== undefined ? inputs.message : (config.message || '');
    const message = typeof rawMessage === 'object' ? JSON.stringify(rawMessage, null, 2) : String(rawMessage);

    console.log(`💬 Showing message: ${title} - ${message}`);

    if (workflow.io && workflow.io.emit) {
        workflow.io.emit('notification', { title, message, type: 'info', timestamp: Date.now() });
    }

    return { title, message, shown: true };
}

async function executeWriteLog(node, workflow, connections, inputs = {}) {
    const fs = require('fs').promises;
    const path = require('path');
    const config = node.config || {};
    const rawMessage = inputs.message !== undefined ? inputs.message : (config.message || '');
    const message = typeof rawMessage === 'object' ? JSON.stringify(rawMessage, null, 2) : String(rawMessage);
    const level = inputs.level !== undefined ? String(inputs.level) : (config.level || 'info');
    const logFile = config.logFile || path.join(process.cwd(), 'logs', 'workflow.log');

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(`📝 Write Log: [${level}] ${message}`);

    await fs.mkdir(path.dirname(logFile), { recursive: true }).catch(() => {});
    await fs.appendFile(logFile, line, 'utf8');

    if (workflow.io && workflow.io.emit) {
        workflow.io.emit('log_entry', {
            source: 'WriteLog',
            level,
            message,
            data: { workflowId: workflow.id, logFile }
        });
    }

    return { success: true, level, message, logFile, timestamp, logged: true };
}

async function executeKeyboardInput(node, workflow, connections, inputs = {}) {
    const { spawn } = require('child_process');
    const config = node.config || {};
    const keys = config.keys || '';
    const delayMs = parseInt(config.delay) || 500;

    if (!keys) return { success: false, error: 'No keys specified' };

    console.log(`⌨️ Keyboard input: "${keys}" (delay: ${delayMs}ms)`);

    return new Promise((resolve) => {
        const psScript = `
            Start-Sleep -Milliseconds ${delayMs}
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait('${keys.replace(/'/g, "''")}')
            Write-Output 'Keys sent: ${keys.replace(/'/g, "''")}'
        `;
        const ps = spawn('powershell', ['-NoProfile', '-Command', psScript], { shell: false });
        let stdout = '', stderr = '';
        ps.stdout.on('data', d => { stdout += d.toString(); });
        ps.stderr.on('data', d => { stderr += d.toString(); });
        ps.on('close', (code) => resolve({ success: code === 0, keys, stdout: stdout.trim(), stderr: stderr.trim(), sent: code === 0 }));
        ps.on('error', (err) => resolve({ success: false, error: err.message }));
    });
}

// ─── SECURITY ─────────────────────────────────────────────────────────────────

async function executeEncryptData(node, workflow, connections, inputs = {}) {
    const crypto = require('crypto');
    const config = node.config || {};
    const data = config.data || '';
    const key = config.key || '';
    const algorithm = 'aes-256-gcm';

    if (!data) return { success: false, error: 'No data to encrypt' };

    console.log(`🔐 Encrypting data with ${algorithm}`);

    try {
        const keyBuffer = crypto.createHash('sha256').update(key || 'default-workflow-key').digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return {
            success: true, algorithm, encrypted,
            iv: iv.toString('hex'), authTag,
            payload: `${iv.toString('hex')}:${authTag}:${encrypted}`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ─── PYTHON ───────────────────────────────────────────────────────────────────

async function executePython(node, workflow, connections, inputs = {}) {
    const { spawn } = require('child_process');
    const fs = require('fs').promises;
    const os = require('os');
    const path = require('path');
    const code = inputs.code !== undefined ? String(inputs.code) : ((node.config && node.config.code) || '');

    if (!code.trim()) return { success: false, error: 'No Python code provided' };

    console.log(`🐍 Executing Python code (${code.length} chars)`);

    const tmpFile = path.join(os.tmpdir(), `wf_python_${Date.now()}.py`);
    await fs.writeFile(tmpFile, code, 'utf8');

    return new Promise((resolve) => {
        // Fixed shell injection vulnerability - use shell: false and proper argument array
        const python = spawn('python', [tmpFile], { shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '', stderr = '';

        python.stdout.on('data', d => { stdout += d.toString(); });
        python.stderr.on('data', d => { stderr += d.toString(); });

        python.on('close', async (exitCode) => {
            await fs.unlink(tmpFile).catch(() => {});
            resolve({
                success: exitCode === 0, exitCode,
                output: stdout.trim(), stderr: stderr.trim(),
                result: stdout.trim()  // port-named alias
            });
        });

        python.on('error', async (err) => {
            await fs.unlink(tmpFile).catch(() => {});
            resolve({ success: false, error: err.message });
        });

        setTimeout(() => {
            python.kill();
            resolve({ success: false, error: 'Python execution timed out after 30s' });
        }, 30000);
    });
}

// ─── SYSTEM ───────────────────────────────────────────────────────────────────

async function executeMonitorFunction(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const target = config.target || '';
    const interval = parseInt(config.interval) || 1000;
    const checks = parseInt(config.checks) || 3;

    console.log(`👁️ Monitoring: "${target}" — ${checks} checks every ${interval}ms`);

    const results = [];
    for (let i = 0; i < checks; i++) {
        if (workflow.cancelled) break;
        let checkResult;

        if (target.startsWith('http://') || target.startsWith('https://')) {
            try {
                const start = Date.now();
                const res = await fetch(target, { method: 'HEAD' });
                checkResult = { check: i + 1, status: res.status, latencyMs: Date.now() - start, ok: res.ok };
            } catch (err) {
                checkResult = { check: i + 1, error: err.message, ok: false };
            }
        } else {
            // Fixed shell injection vulnerability - use spawn with shell: false instead of execSync
            const { spawn } = require('child_process');
            checkResult = await new Promise((resolve) => {
                const tasklist = spawn('tasklist', ['/FI', `IMAGENAME eq ${target}`, '/NH'], { shell: false });
                let stdout = '', stderr = '';
                
                tasklist.stdout.on('data', d => { stdout += d.toString(); });
                tasklist.stderr.on('data', d => { stderr += d.toString(); });
                
                tasklist.on('close', (code) => {
                    const isRunning = stdout.trim().length > 0 && !stdout.includes('No tasks are running');
                    resolve({ check: i + 1, process: target, running: isRunning });
                });
                
                tasklist.on('error', (err) => {
                    resolve({ check: i + 1, error: err.message, ok: false });
                });
            });
        }

        results.push(checkResult);
        if (i < checks - 1) await new Promise(r => setTimeout(r, interval));
    }

    return { success: true, target, checks: results, execution_data: results };
}

async function executeImportModule(node, workflow, connections, inputs = {}) {
    const path = require('path');
    const config = node.config || {};
    const moduleName = config.module || '';
    const modulePath = config.path || '';

    if (!moduleName && !modulePath) return { success: false, error: 'No module or path specified' };

    const toLoad = modulePath ? path.resolve(modulePath) : moduleName;
    console.log(`📦 Importing module: ${toLoad}`);

    try {
        const mod = require(toLoad);
        const exports = Object.keys(mod);
        return { success: true, module: toLoad, exports, type: typeof mod };
    } catch (error) {
        return { success: false, module: toLoad, error: error.message };
    }
}

// ─── FILE SYSTEM ──────────────────────────────────────────────────────────────

async function executeListDirectory(node, workflow, connections, inputs = {}) {
    const fs = require('fs').promises;
    const path = require('path');
    const dirPath = node.config.path || '.';

    console.log(`📁 Listing real directory: ${dirPath}`);

    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const files = [], directories = [];

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            const stats = await fs.stat(fullPath);
            const entry = { name: item.name, path: fullPath, size: stats.size, modified: stats.mtime };
            if (item.isDirectory()) {
                directories.push(entry);
            } else {
                files.push({ ...entry, extension: path.extname(item.name) });
            }
        }

        return { path: dirPath, files, directories, total: files.length + directories.length };
    } catch (error) {
        return { path: dirPath, files: [], directories: [], error: error.message, total: 0 };
    }
}

// ─── PROCESS CONTROL ──────────────────────────────────────────────────────────

async function executeStartProcess(node, workflow, connections, inputs = {}) {
    const { spawn } = require('child_process');
    const command = node.config.command || '';
    const args = node.config.args || [];

    console.log(`🚀 Starting real process: ${command} ${args.join(' ')}`);

    // Fixed shell injection vulnerability - sanitize command and use shell: false with proper argument array
    // Allow only safe commands (whitelist approach)
    const safeCommands = ['node', 'python', 'python3', 'npm', 'git', 'echo', 'dir', 'ls'];
    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];
    
    // Enhanced security check: reject commands with shell metacharacters
    const shellMetacharacters = /[;&|`$()<>]/;
    if (shellMetacharacters.test(command)) {
        return { success: false, error: `Command contains shell metacharacters and is not allowed for security reasons` };
    }
    
    if (!safeCommands.includes(baseCommand)) {
        return { success: false, error: `Command '${baseCommand}' is not allowed for security reasons` };
    }
    
    // Sanitize arguments to prevent shell injection
    const sanitizedArgs = commandParts.slice(1).map(arg => 
        arg.replace(/[;&|`$()<>]/g, '') // Remove shell metacharacters
    );

    return new Promise((resolve, reject) => {
        try {
            // Fixed: use shell: false and proper argument array
            const child = spawn(baseCommand, sanitizedArgs, { stdio: ['pipe', 'pipe', 'pipe'], shell: false });
            let stdout = '', stderr = '';

            child.stdout?.on('data', (data) => { stdout += data.toString(); });
            child.stderr?.on('data', (data) => { stderr += data.toString(); });

            const timeout = setTimeout(() => { child.kill(); reject(new Error('Process timeout')); }, PROCESS_TIMEOUT_MS);

            child.on('close', (code) => {
                clearTimeout(timeout);
                resolve({ processId: child.pid, command, args, exitCode: code, stdout, stderr, status: code === 0 ? 'completed' : 'failed' });
            });

            child.on('error', (error) => { clearTimeout(timeout); reject(error); });
        } catch (error) {
            reject(error);
        }
    });
}

async function executeKillProcess(node, workflow, connections, inputs = {}) {
    const processId = node.config.processId || 0;
    console.log(`🔪 Killing real process: ${processId}`);

    try {
        process.kill(processId, 'SIGTERM');
        await new Promise(resolve => setTimeout(resolve, PROCESS_TERMINATE_DELAY_MS));

        try {
            process.kill(processId, 0);
            process.kill(processId, 'SIGKILL');
            return { processId, status: 'force-killed', signal: 'SIGKILL' };
        } catch {
            return { processId, status: 'killed', signal: 'SIGTERM' };
        }
    } catch (error) {
        return { processId, status: 'failed', error: error.message };
    }
}

// ─── NETWORK ──────────────────────────────────────────────────────────────────

async function executeHTTPRequest(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const url = inputs.url !== undefined ? String(inputs.url) : (config.url || '');
    const method = inputs.method !== undefined ? String(inputs.method) : (config.method || 'GET');
    const headers = config.headers || {};
    const body = inputs.body !== undefined ? inputs.body : (config.body || null);

    console.log(`🌐 Making real HTTP ${method} request to: ${url}`);

    try {
        const options = { method, headers };
        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.text();

        return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data, url, method,
            response: data,        // port-named alias
            status_code: response.status
        };
    } catch (error) {
        return { status: 0, statusText: 'Request Failed', error: error.message, url, method, response: null, status_code: 0 };
    }
}

async function executeDownloadFile(node, workflow, connections, inputs = {}) {
    const fs = require('fs');
    const path = require('path');
    const config = node.config || {};
    const url = inputs.url !== undefined ? String(inputs.url) : (config.url || '');
    const dest = config.destination || path.join(process.cwd(), 'downloads', `file_${Date.now()}`);

    if (!url) return { success: false, error: 'No URL provided' };

    console.log(`⬇️ Downloading: ${url} → ${dest}`);

    try {
        await require('fs').promises.mkdir(path.dirname(dest), { recursive: true });
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        await require('fs').promises.writeFile(dest, buffer);

        return { success: true, url, destination: dest, size: buffer.length, file_path: dest };
    } catch (error) {
        return { success: false, url, error: error.message };
    }
}

// ─── DATA ─────────────────────────────────────────────────────────────────────

async function executeTransformJSON(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const operation = config.operation || 'get';
    const rawInput = inputs.data !== undefined ? inputs.data : config.input;
    let input;

    try {
        input = typeof rawInput === 'string' ? JSON.parse(rawInput) : (rawInput || {});
    } catch {
        return { success: false, error: 'Invalid JSON input' };
    }

    console.log(`🔧 Transform JSON: operation=${operation}`);

    try {
        let result;
        switch (operation) {
            case 'get': {
                const keyPath = (config.key || '').split('.');
                result = keyPath.reduce((obj, k) => obj && obj[k] !== undefined ? obj[k] : undefined, input);
                break;
            }
            case 'set': {
                result = JSON.parse(JSON.stringify(input));
                const keys = (config.key || '').split('.');
                let obj = result;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!obj[keys[i]]) obj[keys[i]] = {};
                    obj = obj[keys[i]];
                }
                obj[keys[keys.length - 1]] = config.value;
                break;
            }
            case 'pick': {
                const picks = (config.keys || '').split(',').map(k => k.trim());
                result = picks.reduce((acc, k) => { if (input[k] !== undefined) acc[k] = input[k]; return acc; }, {});
                break;
            }
            case 'omit': {
                const omits = new Set((config.keys || '').split(',').map(k => k.trim()));
                result = Object.fromEntries(Object.entries(input).filter(([k]) => !omits.has(k)));
                break;
            }
            case 'filter': {
                if (!Array.isArray(input)) throw new Error('Input must be an array for filter');
                const [filterKey, filterVal] = (config.filter || '=').split('=').map(s => s.trim());
                result = input.filter(item => String(item[filterKey]) === filterVal);
                break;
            }
            case 'map': {
                if (!Array.isArray(input)) throw new Error('Input must be an array for map');
                result = input.map(item => item[config.key] !== undefined ? item[config.key] : item);
                break;
            }
            case 'merge': {
                let extra;
                try { extra = JSON.parse(config.merge || '{}'); } catch { extra = {}; }
                result = { ...input, ...extra };
                break;
            }
            case 'keys':      result = Object.keys(input); break;
            case 'values':    result = Object.values(input); break;
            case 'stringify': result = JSON.stringify(input, null, 2); break;
            case 'parse':     result = typeof input === 'string' ? JSON.parse(input) : input; break;
            default:          result = input;
        }
        return { success: true, operation, result };
    } catch (error) {
        return { success: false, operation, error: error.message };
    }
}

async function executeParseText(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const rawText = inputs.text !== undefined ? inputs.text : (config.text || '');
    const text = typeof rawText === 'object' ? JSON.stringify(rawText) : String(rawText);
    const operation = config.operation || 'match';
    const pattern = inputs.pattern !== undefined ? String(inputs.pattern) : (config.pattern || '');
    const flags = config.flags || 'g';

    console.log(`🔍 Parse Text: operation=${operation}, pattern="${pattern}"`);

    try {
        let result;
        switch (operation) {
            case 'match':   result = text.match(new RegExp(pattern, flags)) || []; break;
            case 'replace': result = text.replace(new RegExp(pattern, flags), config.replacement || ''); break;
            case 'split':   result = text.split(new RegExp(pattern || config.delimiter || '\n')); break;
            case 'trim':    result = text.trim(); break;
            case 'lines':   result = text.split('\n').map(l => l.trim()).filter(Boolean); break;
            case 'count':   result = (text.match(new RegExp(pattern, flags)) || []).length; break;
            case 'contains': result = pattern ? text.includes(pattern) : false; break;
            case 'extract': {
                const re = new RegExp(pattern, 'g');
                result = [];
                let m;
                while ((m = re.exec(text)) !== null) {
                    result.push(m[1] !== undefined ? m[1] : m[0]);
                }
                break;
            }
            default: result = text;
        }
        return { success: true, operation, result, inputLength: text.length, matches: result };
    } catch (error) {
        return { success: false, operation, error: error.message, matches: null };
    }
}

async function executeSQLQuery(node, workflow, connections, inputs = {}) {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const config = node.config || {};
    const query = config.query || '';
    const dbPath = config.dbPath || path.join(process.cwd(), 'data', 'runtime_monitor.db');

    if (!query.trim()) return { success: false, error: 'No SQL query provided' };

    console.log(`🗄️ SQL Query: ${query.substring(0, 80)}...`);

    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) return resolve({ success: false, error: `DB open failed: ${err.message}` });

            const isSelect = query.trim().toUpperCase().startsWith('SELECT') ||
                             query.trim().toUpperCase().startsWith('PRAGMA');

            if (isSelect) {
                db.all(query, [], (err, rows) => {
                    db.close();
                    if (err) return resolve({ success: false, error: err.message });
                    resolve({ success: true, rows, count: rows.length, query, results: rows });
                });
            } else {
                resolve({ success: false, error: 'Only SELECT queries allowed in SQL Query node' });
                db.close();
            }
        });
    });
}

// ─── FRONTEND DESIGN ──────────────────────────────────────────────────────────

async function executeScreenshot(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const format = config.format || 'png';
    const savePath = config.savePath || '';
    const target = config.target || 'screen';

    console.log(`📸 Screenshot requested: target=${target}, format=${format}`);

    try {
        const path = require('path');
        const outputPath = savePath || path.join(
            workflow.context ? workflow.context.assetsDir : require('os').tmpdir(),
            `screenshot_${Date.now()}.${format}`
        );

        console.log(`📸 Screenshot would save to: ${outputPath}`);
        return {
            success: true, path: outputPath, format, target,
            timestamp: new Date().toISOString(),
            image: outputPath,
            note: 'Screenshot capture requires Electron renderer context for full desktop capture'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function executeHTMLSnapshot(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const url = inputs.url !== undefined ? String(inputs.url) : (config.url || '');
    const timeout = config.timeout || 5000;

    if (!url) return { success: false, error: 'No URL provided' };

    console.log(`🌐 HTML Snapshot: fetching ${url}`);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        const htmlContent = await response.text();
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);

        return {
            success: true, url, status: response.status,
            html: htmlContent, length: htmlContent.length,
            title: titleMatch ? titleMatch[1].trim() : 'Unknown',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, url, error: error.message };
    }
}

async function executeCSSInject(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const css = config.css || '';
    const target = config.target || 'node-editor';

    if (!css) return { success: false, error: 'No CSS provided' };

    console.log(`🎨 CSS Inject: ${css.length} chars -> target: ${target}`);

    // Emit via EventEmitter on the engine (workflow.emitFn set by engine)
    if (workflow.emitFn) {
        workflow.emitFn('css_inject', { target, css, workflowId: workflow.id });
    }

    return { success: true, target, bytesInjected: css.length, timestamp: new Date().toISOString(), result: true };
}

async function executeImageResize(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const inputPath = config.inputPath || '';
    const outputPath = config.outputPath || inputPath.replace(/(\.[^.]+)$/, `_resized$1`);
    const width = parseInt(config.width) || 800;
    const height = parseInt(config.height) || 600;
    const fit = config.fit || 'cover';
    const format = config.format || 'png';

    if (!inputPath) return { success: false, error: 'No input path provided' };

    console.log(`🖼️ Image Resize: ${inputPath} → ${width}x${height}`);

    try {
        const sharp = require('sharp');
        await sharp(inputPath).resize(width, height, { fit }).toFormat(format).toFile(outputPath);
        return { success: true, inputPath, outputPath, width, height, format };
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            return { success: false, error: 'sharp not installed — run: npm install sharp' };
        }
        return { success: false, error: error.message };
    }
}

async function executeColorPicker(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const imagePath = config.imagePath || '';
    const count = parseInt(config.count) || 5;

    if (!imagePath) return { success: false, error: 'No image path provided' };

    console.log(`🎯 Color Picker: extracting ${count} colors from ${imagePath}`);

    try {
        const sharp = require('sharp');
        const { data, info } = await sharp(imagePath)
            .resize(50, 50, { fit: 'cover' })
            .raw()
            .toBuffer({ resolveWithObject: true });

        const pixels = [];
        const step = Math.max(1, Math.floor(data.length / (info.channels * count)));
        for (let i = 0; i < data.length; i += step * info.channels) {
            if (pixels.length >= count) break;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            pixels.push({ hex, rgb: { r, g, b } });
        }

        return { success: true, imagePath, colors: pixels };
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            return { success: false, error: 'sharp not installed — run: npm install sharp' };
        }
        return { success: false, error: error.message };
    }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

module.exports = {
    executeStart,
    executeEnd,
    executeCondition,
    executeDelay,
    executeWait,
    executeLoop,
    executeShowMessage,
    executeWriteLog,
    executeKeyboardInput,
    executeEncryptData,
    executePython,
    executeMonitorFunction,
    executeImportModule,
    executeListDirectory,
    executeStartProcess,
    executeKillProcess,
    executeHTTPRequest,
    executeDownloadFile,
    executeTransformJSON,
    executeParseText,
    executeSQLQuery,
    executeScreenshot,
    executeHTMLSnapshot,
    executeCSSInject,
    executeImageResize,
    executeColorPicker,
};
