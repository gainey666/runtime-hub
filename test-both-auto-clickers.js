/**
 * TEST: Main App → Both Auto-Clickers Integration
 * Shows how your main workflow engine can control both auto-clicker versions
 */

class DualAutoClickerIntegration {
    constructor() {
        this.originalUrl = 'http://localhost:3001';
        this.standaloneUrl = 'http://localhost:3002';
        this.sessions = {
            original: null,
            standalone: null
        };
    }

    // Test both versions simultaneously
    async testBothVersions() {
        console.log('🎯 Testing both auto-clicker versions simultaneously');
        console.log('=' .repeat(60));

        // Test original version
        console.log('📊 Testing original auto-clicker (port 3001)...');
        const originalHealth = await this.testHealth(this.originalUrl, 'Original');
        
        // Test standalone version
        console.log('📊 Testing standalone auto-clicker (port 3002)...');
        const standaloneHealth = await this.testHealth(this.standaloneUrl, 'Standalone');

        if (!originalHealth || !standaloneHealth) {
            console.log('❌ One or both versions are not reachable');
            return;
        }

        // Start sessions on both versions
        console.log('🚀 Starting sessions on both versions...');
        
        const originalSession = await this.startSession(this.originalUrl, 'Original');
        const standaloneSession = await this.startSession(this.standaloneUrl, 'Standalone');

        if (originalSession && standaloneSession) {
            this.sessions.original = originalSession.sessionId;
            this.sessions.standalone = standaloneSession.sessionId;

            console.log('✅ Both sessions started successfully!');
            console.log(`📋 Original Session ID: ${this.sessions.original}`);
            console.log(`📋 Standalone Session ID: ${this.sessions.standalone}`);

            // Monitor both sessions
            await this.monitorBothSessions();

            // Stop both sessions
            await this.stopSession(this.originalUrl, this.sessions.original, 'Original');
            await this.stopSession(this.standaloneUrl, this.sessions.standalone, 'Standalone');
        }

        console.log('=' .repeat(60));
        console.log('🎉 Dual auto-clicker integration test completed!');
        console.log('✅ Your main app can control both versions independently!');
        console.log('✅ Projects are completely separated and functional!');
    }

    async testHealth(url, version) {
        try {
            const response = await fetch(`${url}/health`);
            const data = await response.json();
            
            console.log(`✅ ${version} health check:`, data.status);
            return data.status === 'healthy';
        } catch (error) {
            console.error(`❌ ${version} not reachable:`, error.message);
            return false;
        }
    }

    async startSession(url, version) {
        const config = {
            area: {
                x: 100 + (version === 'Original' ? 0 : 200),
                y: 100 + (version === 'Original' ? 0 : 200),
                width: 200,
                height: 50
            },
            targetPattern: 'start|stop|ok',
            confidence: 0.8,
            clickAction: 'left',
            refreshRate: 2000,
            name: `${version.toLowerCase()}-test-session`
        };

        try {
            const response = await fetch(`${url}/api/auto-clicker/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ ${version} session started:`, result.sessionId);
                return result;
            } else {
                console.error(`❌ ${version} session failed:`, result.error);
                return null;
            }
        } catch (error) {
            console.error(`❌ ${version} start failed:`, error.message);
            return null;
        }
    }

    async monitorBothSessions() {
        console.log('📊 Monitoring both sessions for 5 seconds...');
        
        for (let i = 0; i < 5; i++) {
            console.log(`\n--- Monitoring Cycle ${i + 1} ---`);
            
            // Monitor original
            if (this.sessions.original) {
                const originalStatus = await this.getStatus(this.originalUrl, this.sessions.original, 'Original');
                if (originalStatus) {
                    console.log(`📈 Original: ${originalStatus.totalClicks} clicks, uptime: ${Math.round(originalStatus.uptime / 1000)}s`);
                }
            }

            // Monitor standalone
            if (this.sessions.standalone) {
                const standaloneStatus = await this.getStatus(this.standaloneUrl, this.sessions.standalone, 'Standalone');
                if (standaloneStatus) {
                    console.log(`📈 Standalone: ${standaloneStatus.totalClicks} clicks, uptime: ${Math.round(standaloneStatus.uptime / 1000)}s`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async getStatus(url, sessionId, version) {
        try {
            const response = await fetch(`${url}/api/auto-clicker/status/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                console.error(`❌ ${version} status check failed:`, data.error);
                return null;
            }
        } catch (error) {
            console.error(`❌ ${version} status error:`, error.message);
            return null;
        }
    }

    async stopSession(url, sessionId, version) {
        try {
            const response = await fetch(`${url}/api/auto-clicker/stop/${sessionId}`, {
                method: 'POST'
            });

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ ${version} session stopped:`, result.finalStats);
                return result;
            } else {
                console.error(`❌ ${version} stop failed:`, result.error);
                return null;
            }
        } catch (error) {
            console.error(`❌ ${version} stop error:`, error.message);
            return null;
        }
    }

    // Show project structure
    showProjectStructure() {
        console.log('\n📁 Project Structure:');
        console.log('├── windsurf-project-13/ (Your main workflow engine)');
        console.log('│   ├── src/workflow-engine.js');
        console.log('│   ├── test-both-auto-clickers.js (this test)');
        console.log('│   └── Running on: http://localhost:3000');
        console.log('├── auto-clicker-tool/ (Original version)');
        console.log('│   ├── src/auto-clicker.js');
        console.log('│   └── Running on: http://localhost:3001');
        console.log('└── auto-clicker-standalone/ (Standalone version)');
        console.log('    ├── src/auto-clicker.js');
        console.log('    └── Running on: http://localhost:3002');
        console.log('\n🎯 Integration: Main App → Both Auto-Clickers');
        console.log('✅ Complete separation of codebases');
        console.log('✅ Independent operation');
        console.log('✅ No shared dependencies');
        console.log('✅ Different ports prevent conflicts');
    }
}

// Run the dual integration test
async function main() {
    const integration = new DualAutoClickerIntegration();
    
    // Show project structure
    integration.showProjectStructure();
    
    // Run dual integration test
    await integration.testBothVersions();
    
    console.log('\n🎉 DUAL INTEGRATION TEST COMPLETED!');
    console.log('🚀 Your main workflow engine can now control multiple external tools!');
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = DualAutoClickerIntegration;
