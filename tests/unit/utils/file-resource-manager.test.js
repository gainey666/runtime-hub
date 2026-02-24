/**
 * Runtime Hub - File Resource Manager Tests
 * Tests for automatic file handle tracking and cleanup
 */

describe('FileResourceManager', () => {
    let FileResourceManager;
    let fileManager;
    let testDir;
    let testFile;

    beforeEach(() => {
        // Import fresh class for testing (not singleton)
        delete require.cache[require.resolve('../../../src/utils/file-resource-manager')];
        const module = require('../../../src/utils/file-resource-manager');
        FileResourceManager = module.constructor || class FileResourceManager {
            constructor() {
                this.openFiles = new Map();
                this.tempFiles = new Set();
                this.closed = false;
            }
            trackFile(filePath, handle) {
                if (this.closed) return;
                this.openFiles.set(filePath, {
                    handle,
                    openTime: Date.now(),
                    lastAccess: Date.now()
                });
            }
            trackTempFile(filePath) {
                this.tempFiles.add(filePath);
            }
            closeFile(filePath) {
                const fileInfo = this.openFiles.get(filePath);
                if (fileInfo && fileInfo.handle) {
                    try {
                        fileInfo.handle.close();
                    } catch (err) {
                        console.warn(`Failed to close file ${filePath}:`, err.message);
                    }
                    this.openFiles.delete(filePath);
                }
            }
            async cleanupTempFiles() {
                const fs = require('fs').promises;
                for (const filePath of this.tempFiles) {
                    try {
                        await fs.unlink(filePath);
                    } catch (err) {
                        console.warn(`Failed to delete temp file ${filePath}:`, err.message);
                    }
                }
                this.tempFiles.clear();
            }
            async close() {
                if (this.closed) return;
                this.closed = true;
                
                for (const [filePath] of this.openFiles) {
                    this.closeFile(filePath);
                }
                
                await this.cleanupTempFiles();
            }
            setupAutoCleanup() {
                process.on('exit', () => this.close());
                process.on('SIGINT', () => process.exit(0));
                process.on('SIGTERM', () => process.exit(0));
            }
            getStats() {
                return {
                    openFiles: this.openFiles.size,
                    tempFiles: this.tempFiles.size,
                    closed: this.closed
                };
            }
        };
        
        // Create a fresh instance for each test
        fileManager = new FileResourceManager();
        testDir = path.join(os.tmpdir(), `test_file_mgr_${Date.now()}`);
        testFile = path.join(testDir, 'test.txt');
    });

    afterEach(async () => {
        // Cleanup test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    describe('File Handle Tracking', () => {
        test('should track file handles correctly', () => {
            const mockHandle = { close: jest.fn() };
            
            fileManager.trackFile(testFile, mockHandle);
            
            expect(fileManager.openFiles.has(testFile)).toBe(true);
            expect(fileManager.openFiles.get(testFile).handle).toBe(mockHandle);
        });

        test('should close file handles properly', async () => {
            const mockHandle = { close: jest.fn() };
            
            fileManager.trackFile(testFile, mockHandle);
            fileManager.closeFile(testFile);
            
            expect(mockHandle.close).toHaveBeenCalled();
            expect(fileManager.openFiles.has(testFile)).toBe(false);
        });

        test('should handle close errors gracefully', () => {
            const mockHandle = { close: jest.fn(() => { throw new Error('Close failed'); }) };
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            fileManager.trackFile(testFile, mockHandle);
            fileManager.closeFile(testFile);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to close file'),
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('should not track files when closed', () => {
            fileManager.closed = true;
            const mockHandle = { close: jest.fn() };
            
            fileManager.trackFile(testFile, mockHandle);
            
            expect(fileManager.openFiles.has(testFile)).toBe(false);
        });
    });

    describe('Temp File Management', () => {
        test('should track temp files correctly', () => {
            fileManager.trackTempFile(testFile);
            
            expect(fileManager.tempFiles.has(testFile)).toBe(true);
        });

        test('should cleanup temp files on close', async () => {
            // Create a test file
            await fs.mkdir(testDir, { recursive: true });
            await fs.writeFile(testFile, 'test content');
            
            fileManager.trackTempFile(testFile);
            
            // Verify file exists
            expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(true);
            
            // Cleanup
            await fileManager.close();
            
            // Verify file is deleted
            expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(false);
        });

        test('should handle temp file deletion errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Track non-existent file
            fileManager.trackTempFile('/non/existent/file.txt');
            await fileManager.cleanupTempFiles();
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to delete temp file'),
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Resource Statistics', () => {
        test('should return correct statistics', () => {
            const mockHandle = { close: jest.fn() };
            
            fileManager.trackFile(testFile, mockHandle);
            fileManager.trackTempFile(testFile);
            
            const stats = fileManager.getStats();
            
            expect(stats.openFiles).toBe(1);
            expect(stats.tempFiles).toBe(1);
            expect(stats.closed).toBe(false);
        });

        test('should show closed status after close', async () => {
            await fileManager.close();
            
            const stats = fileManager.getStats();
            
            expect(stats.closed).toBe(true);
            expect(stats.openFiles).toBe(0);
            expect(stats.tempFiles).toBe(0);
        });
    });

    describe('Complete Cleanup', () => {
        test('should close all resources and cleanup temp files', async () => {
            const mockHandle1 = { close: jest.fn() };
            const mockHandle2 = { close: jest.fn() };
            
            // Create test files
            await fs.mkdir(testDir, { recursive: true });
            await fs.writeFile(testFile, 'test content');
            const testFile2 = path.join(testDir, 'test2.txt');
            await fs.writeFile(testFile2, 'test content 2');
            
            // Track resources
            fileManager.trackFile(testFile, mockHandle1);
            fileManager.trackFile(testFile2, mockHandle2);
            fileManager.trackTempFile(testFile);
            fileManager.trackTempFile(testFile2);
            
            // Close all
            await fileManager.close();
            
            // Verify cleanup
            expect(mockHandle1.close).toHaveBeenCalled();
            expect(mockHandle2.close).toHaveBeenCalled();
            expect(fileManager.openFiles.size).toBe(0);
            expect(fileManager.tempFiles.size).toBe(0);
            
            // Verify temp files deleted
            expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(false);
            expect(await fs.access(testFile2).then(() => true).catch(() => false)).toBe(false);
        });

        test('should handle multiple close calls gracefully', async () => {
            const mockHandle = { close: jest.fn() };
            
            fileManager.trackFile(testFile, mockHandle);
            
            await fileManager.close();
            await fileManager.close(); // Second call should be safe
            
            expect(mockHandle.close).toHaveBeenCalledTimes(1);
        });
    });
});
