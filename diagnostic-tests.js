/**
 * Diagnostic Tests - Find out what's actually broken
 */

const http = require('http');
const io = require('socket.io-client');

class DiagnosticTester {
    constructor() {
        this.results = {
            mainServer: false,
            autoClickerAPI: false,
            socketConnection: false,
            nodeEditorAPI: false,
            dashboardConnection: false
        };
    }

    async runAllTests() {
        console.log('🔍 STARTING DIAGNOSTIC TESTS...\n');
        
        await this.testMainServer();
        await this.testAutoClickerAPI();
        await this.testSocketConnection();
        await this.testNodeEditorAPI();
        await this.testDashboardConnection();
        
        this.printResults();
        return this.results;
    }

    async testMainServer() {
        console.log('📡 Testing Main Server (port 3000)...');
        
        return new Promise((resolve) => {
            const req = http.get('http://localhost:3000/health', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const health = JSON.parse(data);
                        console.log('✅ Main Server Health:', health.status);
                        this.results.mainServer = true;
                    } catch (e) {
                        console.log('❌ Main Server: Invalid JSON response');
                        this.results.mainServer = false;
                    }
                    resolve();
                });
            });
            
            req.on('error', () => {
                console.log('❌ Main Server: Connection failed');
                this.results.mainServer = false;
                resolve();
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                console.log('❌ Main Server: Timeout');
                this.results.mainServer = false;
                resolve();
            });
        });
    }

    async testAutoClickerAPI() {
        console.log('🖱️ Testing Auto-Clicker API (port 3001)...');
        
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                area: {
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 200
                },
                targetPattern: 'test',
                clickAction: 'left',
                refreshRate: 1000
            });
            
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/api/auto-clicker/start',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log('📊 Auto-Clicker Response:', res.statusCode);
                    console.log('📝 Response Body:', data);
                    
                    if (res.statusCode === 200) {
                        this.results.autoClickerAPI = true;
                    } else {
                        this.results.autoClickerAPI = false;
                    }
                    resolve();
                });
            });
            
            req.on('error', (error) => {
                console.log('❌ Auto-Clicker API Error:', error.message);
                this.results.autoClickerAPI = false;
                resolve();
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                console.log('❌ Auto-Clicker API: Timeout');
                this.results.autoClickerAPI = false;
                resolve();
            });
            
            req.write(postData);
            req.end();
        });
    }

    async testSocketConnection() {
        console.log('🔌 Testing Socket Connection...');
        
        return new Promise((resolve) => {
            const socket = io('http://localhost:3000');
            
            const timeout = setTimeout(() => {
                console.log('❌ Socket Connection: Timeout');
                this.results.socketConnection = false;
                resolve();
            }, 5000);
            
            socket.on('connect', () => {
                console.log('✅ Socket Connection: Connected');
                this.results.socketConnection = true;
                clearTimeout(timeout);
                socket.disconnect();
                resolve();
            });
            
            socket.on('connect_error', (error) => {
                console.log('❌ Socket Connection Error:', error.message);
                this.results.socketConnection = false;
                clearTimeout(timeout);
                resolve();
            });
        });
    }

    async testNodeEditorAPI() {
        console.log('🎮 Testing Node Editor API...');
        
        return new Promise((resolve) => {
            const req = http.get('http://localhost:3000/node-editor', (res) => {
                console.log('📊 Node Editor Response:', res.statusCode);
                this.results.nodeEditorAPI = res.statusCode === 200;
                resolve();
            });
            
            req.on('error', () => {
                console.log('❌ Node Editor API: Connection failed');
                this.results.nodeEditorAPI = false;
                resolve();
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                console.log('❌ Node Editor API: Timeout');
                this.results.nodeEditorAPI = false;
                resolve();
            });
        });
    }

    async testDashboardConnection() {
        console.log('📊 Testing Dashboard Connection...');
        
        return new Promise((resolve) => {
            const req = http.get('http://localhost:3000/', (res) => {
                console.log('📊 Dashboard Response:', res.statusCode);
                this.results.dashboardConnection = res.statusCode === 200;
                resolve();
            });
            
            req.on('error', () => {
                console.log('❌ Dashboard Connection: Failed');
                this.results.dashboardConnection = false;
                resolve();
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                console.log('❌ Dashboard Connection: Timeout');
                this.results.dashboardConnection = false;
                resolve();
            });
        });
    }

    printResults() {
        console.log('\n🎯 DIAGNOSTIC RESULTS:');
        console.log('===================');
        
        const total = Object.keys(this.results).length;
        const working = Object.values(this.results).filter(Boolean).length;
        const percentage = Math.round((working / total) * 100);
        
        Object.entries(this.results).forEach(([test, passed]) => {
            const status = passed ? '✅' : '❌';
            const name = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            console.log(`${status} ${name}: ${passed ? 'WORKING' : 'BROKEN'}`);
        });
        
        console.log('\n📊 OVERALL STATUS:');
        console.log(`🎯 Current: ${percentage}% (${working}/${total} systems working)`);
        console.log(`🎯 Target: 80% functionality`);
        console.log(`🎯 Gap: ${80 - percentage}% to go`);
        
        if (percentage < 80) {
            console.log('\n🔧 CRITICAL ISSUES TO FIX:');
            Object.entries(this.results).forEach(([test, passed]) => {
                if (!passed) {
                    console.log(`❌ ${test.toUpperCase()} needs immediate attention`);
                }
            });
        }
    }
}

// Run diagnostics
const tester = new DiagnosticTester();
tester.runAllTests().then(results => {
    console.log('\n🏁 Diagnostic complete!');
    process.exit(results);
});
