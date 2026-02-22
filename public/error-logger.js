/**
 * Simple Error Logger for Runtime Hub
 */
window.errorLogger = {
    errors: [],

    logError(title, details) {
        const error = {
            timestamp: new Date().toISOString(),
            title,
            details
        };
        this.errors.push(error);
        console.error(`[ErrorLogger] ${title}:`, details);
    },

    getErrors() {
        return this.errors;
    },

    clearErrors() {
        this.errors = [];
    }
};
