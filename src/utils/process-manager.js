/**
 * Runtime Hub - Process Manager
 * Automatic child process lifecycle management with timeouts
 */

class ProcessManager {
    constructor() {
        this.activeProcesses = new Map();
    }

    trackProcess(name, process, timeoutMs = 30000) {
        const processInfo = {
            process,
            name,
            startTime: Date.now(),
            timeoutId: setTimeout(() => {
                console.warn(`Process ${name} timeout after ${timeoutMs}ms`);
                this.killProcess(name);
            }, timeoutMs)
        };
        this.activeProcesses.set(name, processInfo);
    }

    killProcess(name) {
        const processInfo = this.activeProcesses.get(name);
        if (processInfo) {
            clearTimeout(processInfo.timeoutId);
            try {
                processInfo.process.kill('SIGTERM');
                setTimeout(() => {
                    if (!processInfo.process.killed) {
                        processInfo.process.kill('SIGKILL');
                    }
                }, 2000);
            } catch (err) {
                console.warn(`Failed to kill process ${name}:`, err.message);
            }
            this.activeProcesses.delete(name);
        }
    }

    killAllProcesses() {
        for (const [name] of this.activeProcesses) {
            this.killProcess(name);
        }
    }

    // Get statistics for monitoring
    getStats() {
        const now = Date.now();
        return {
            activeProcesses: this.activeProcesses.size,
            processes: Array.from(this.activeProcesses.entries()).map(([name, info]) => ({
                name,
                runningTime: now - info.startTime
            }))
        };
    }

    // Setup graceful shutdown
    setupGracefulShutdown() {
        process.on('SIGINT', () => {
            console.log('SIGINT received, killing all processes...');
            this.killAllProcesses();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('SIGTERM received, killing all processes...');
            this.killAllProcesses();
            process.exit(0);
        });
    }
}

module.exports = new ProcessManager();
