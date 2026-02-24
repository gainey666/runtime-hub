/**
 * Runtime Hub - Process Manager Tests
 * Tests for child process lifecycle management
 */

const ProcessManager = require('../../../src/utils/process-manager');
const { spawn } = require('child_process');

describe('ProcessManager', () => {
    let processManager;

    beforeEach(() => {
        processManager = new ProcessManager();
    });

    afterEach(() => {
        // Clean up any remaining processes
        processManager.killAllProcesses();
    });

    describe('Process Tracking', () => {
        test('should track processes correctly', (done) => {
            // Create a long-running process
            const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            processManager.trackProcess('test-process', process, 5000);
            
            expect(processManager.activeProcesses.has('test-process')).toBe(true);
            expect(processManager.activeProcesses.get('test-process').process).toBe(process);
            expect(processManager.activeProcesses.get('test-process').name).toBe('test-process');
            
            // Clean up
            process.kill();
            done();
        });

        test('should kill processes correctly', (done) => {
            const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            processManager.trackProcess('test-process', process, 5000);
            
            // Kill the process
            processManager.killProcess('test-process');
            
            expect(processManager.activeProcesses.has('test-process')).toBe(false);
            
            // Verify process is killed
            setTimeout(() => {
                expect(process.killed).toBe(true);
                done();
            }, 100);
        });

        test('should handle kill errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Try to kill non-existent process
            processManager.killProcess('non-existent-process');
            
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('Process Timeout', () => {
        test('should timeout processes automatically', (done) => {
            const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            processManager.trackProcess('timeout-test', process, 100); // 100ms timeout
            
            // Process should be killed after timeout
            setTimeout(() => {
                expect(processManager.activeProcesses.has('timeout-test')).toBe(false);
                done();
            }, 200);
        });

        test('should clear timeout when process is killed manually', (done) => {
            const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            
            processManager.trackProcess('manual-kill-test', process, 5000);
            processManager.killProcess('manual-kill-test');
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            
            clearTimeoutSpy.mockRestore();
            done();
        });
    });

    describe('Process Statistics', () => {
        test('should return correct statistics', (done) => {
            const process1 = spawn('node', ['-e', 'setTimeout(() => {}, 1000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            const process2 = spawn('node', ['-e', 'setTimeout(() => {}, 1000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            processManager.trackProcess('process1', process1);
            processManager.trackProcess('process2', process2);
            
            const stats = processManager.getStats();
            
            expect(stats.activeProcesses).toBe(2);
            expect(stats.processes).toHaveLength(2);
            expect(stats.processes[0].name).toBe('process1');
            expect(stats.processes[1].name).toBe('process2');
            expect(stats.processes[0].runningTime).toBeGreaterThanOrEqual(0);
            expect(stats.processes[1].runningTime).toBeGreaterThanOrEqual(0);
            
            // Clean up
            process1.kill();
            process2.kill();
            done();
        });

        test('should show empty stats when no processes', () => {
            const stats = processManager.getStats();
            
            expect(stats.activeProcesses).toBe(0);
            expect(stats.processes).toHaveLength(0);
        });
    });

    describe('Kill All Processes', () => {
        test('should kill all tracked processes', (done) => {
            const process1 = spawn('node', ['-e', 'setTimeout(() => {}, 1000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            const process2 = spawn('node', ['-e', 'setTimeout(() => {}, 1000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            processManager.trackProcess('process1', process1);
            processManager.trackProcess('process2', process2);
            
            expect(processManager.activeProcesses.size).toBe(2);
            
            processManager.killAllProcesses();
            
            expect(processManager.activeProcesses.size).toBe(0);
            
            // Verify processes are killed
            setTimeout(() => {
                expect(process1.killed).toBe(true);
                expect(process2.killed).toBe(true);
                done();
            }, 100);
        });
    });

    describe('Graceful Shutdown', () => {
        test('should setup graceful shutdown handlers', () => {
            const processOnSpy = jest.spyOn(process, 'on').mockImplementation();
            
            processManager.setupGracefulShutdown();
            
            expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
            expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            
            processOnSpy.mockRestore();
        });
    });

    describe('Process Escalation', () => {
        test('should escalate from SIGTERM to SIGKILL', (done) => {
            // Create a process that ignores SIGTERM
            const process = spawn('node', ['-e', `
                process.on('SIGTERM', () => {
                    // Ignore SIGTERM
                });
                setTimeout(() => {}, 10000);
            `], { 
                stdio: 'pipe',
                shell: false 
            });
            
            processManager.trackProcess('escalation-test', process);
            processManager.killProcess('escalation-test');
            
            // Process should receive SIGTERM first, then SIGKILL after 2 seconds
            setTimeout(() => {
                // After 2 seconds, process should be force killed
                expect(process.killed).toBe(true);
                done();
            }, 2500);
        });
    });
});
