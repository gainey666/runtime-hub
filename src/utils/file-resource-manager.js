/**
 * Runtime Hub - File Resource Manager
 * Automatic file handle and temp file lifecycle management
 */

class FileResourceManager {
    constructor() {
        this.openFiles = new Map();
        this.tempFiles = new Set();
        this.closed = false;
    }

    // Track file handles with automatic cleanup
    trackFile(filePath, handle) {
        if (this.closed) return;
        this.openFiles.set(filePath, {
            handle,
            openTime: Date.now(),
            lastAccess: Date.now()
        });
    }

    // Track temp files for auto-deletion
    trackTempFile(filePath) {
        this.tempFiles.add(filePath);
    }

    // Close file handle
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

    // Cleanup temp files
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

    // Close all resources
    async close() {
        if (this.closed) return;
        this.closed = true;
        
        // Close all open file handles
        for (const [filePath] of this.openFiles) {
            this.closeFile(filePath);
        }
        
        // Cleanup temp files
        await this.cleanupTempFiles();
    }

    // Auto-cleanup on process exit
    setupAutoCleanup() {
        process.on('exit', () => this.close());
        process.on('SIGINT', () => process.exit(0));
        process.on('SIGTERM', () => process.exit(0));
    }

    // Get statistics for monitoring
    getStats() {
        return {
            openFiles: this.openFiles.size,
            tempFiles: this.tempFiles.size,
            closed: this.closed
        };
    }
}

module.exports = new FileResourceManager();
