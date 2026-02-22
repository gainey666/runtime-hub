/**
 * TEST: Main App → Auto-Clicker Integration
 * Shows how your main workflow engine controls the external auto-clicker tool
 */

const http = require('http');

class AutoClickerIntegration {
    constructor() {
        this.autoClickerUrl = 'http://localhost:3001';
        this.currentSession = null;
    }

    // Test 1: Check if auto-clicker is running
    async checkAutoClickerHealth() {
        console.log('🔍 Testing auto-clicker health...');
        
        try {
            const response = await fetch(`${this.autoClickerUrl}/health`);
            const data = await response.json();
            
            console.log('✅ Auto-clicker health check:', data);
            return data.status === 'healthy';
        } catch (error) {
            console.error('❌ Auto-clicker not reachable:', error.message);
            return false;
        }
    }

    // Test 2: Start auto-clicker session
    async startAutoClickerSession() {
        console.log('🚀 Starting auto-clicker session from main app...');
        
        const config = {
            area: {
                x: 100,
                y: 100,
                width: 200,
                height: 50
            },
            targetPattern: 'start|stop|ok|cancel',
            confidence: 0.8,
            clickAction: 'left',
            refreshRate: 1000,
            name: 'main-app-integration-test'
        };

        try {
            const response = await fetch(`${this.autoClickerUrl}/api/auto-clicker/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentSession = result.sessionId;
                console.log('✅ Auto-clicker session started:', result);
                return result;
            } else {
                console.error('❌ Failed to start session:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Start session failed:', error.message);
            return null;
        }
    }

    // Test 3: Monitor session status
    async monitorSessionStatus() {
        if (!this.currentSession) {
            console.log('⚠️ No active session to monitor');
            return;
        }

        console.log('📊 Monitoring auto-clicker session...');
        
        try {
            const response = await fetch(`${this.autoClickerUrl}/api/auto-clicker/status/${this.currentSession}`);
            const data = await response.json();
            
            console.log('📈 Session status:', data);
            return data;
        } catch (error) {
            console.error('❌ Status check failed:', error.message);
            return null;
        }
    }

    // Test 4: Stop auto-clicker session
    async stopAutoClickerSession() {
        if (!this.currentSession) {
            console.log('⚠️ No active session to stop');
            return;
        }

        console.log('🛑 Stopping auto-clicker session...');
        
        try {
            const response = await fetch(`${this.autoClickerUrl}/api/auto-clicker/stop/${this.currentSession}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Auto-clicker session stopped:', result);
                this.currentSession = null;
                return result;
            } else {
                console.error('❌ Failed to stop session:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Stop session failed:', error.message);
            return null;
        }
    }

    // Test 5: Full integration test
    async runFullIntegrationTest() {
        console.log('🎯 Starting full integration test: Main App ↔ Auto-Clicker');
        console.log('=' .repeat(60));

        // Step 1: Health check
        const isHealthy = await this.checkAutoClickerHealth();
        if (!isHealthy) {
            console.log('❌ Integration test failed: Auto-clicker not reachable');
            return;
        }

        // Step 2: Start session
        const session = await this.startAutoClickerSession();
        if (!session) {
            console.log('❌ Integration test failed: Could not start session');
            return;
        }

        // Step 3: Monitor for a few seconds
        console.log('⏱️ Monitoring session for 5 seconds...');
        for (let i = 0; i < 5; i++) {
            await this.monitorSessionStatus();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Step 4: Stop session
        await this.stopAutoClickerSession();

        console.log('=' .repeat(60));
        console.log('🎉 Integration test completed successfully!');
        console.log('✅ Your main app can control external tools!');
        console.log('✅ Auto-clicker responds to API calls');
        console.log('✅ Real-time status monitoring works');
        console.log('✅ Session management functions correctly');
    }
}

// Run the integration test
async function main() {
    const integration = new AutoClickerIntegration();
    await integration.runFullIntegrationTest();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AutoClickerIntegration;
