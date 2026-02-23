/**
 * API Response Time Investigation
 * Investigating why /api/workflows takes 75.76ms vs 20ms target
 */

const http = require('http');

// Test API response times
async function testAPIResponseTimes() {
    console.log('🔍 Investigating API Response Times...\n');
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/workflows',
        method: 'GET'
    };
    
    const times = [];
    const testCount = 10;
    
    console.log(`Running ${testCount} consecutive API calls to check for cold start vs real bottleneck...\n`);
    
    for (let i = 0; i < testCount; i++) {
        const startTime = process.hrtime.bigint();
        
        try {
            const response = await new Promise((resolve, reject) => {
                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve({ statusCode: res.statusCode, data }));
                });
                
                req.on('error', reject);
                req.end();
            });
            
            const endTime = process.hrtime.bigint();
            const responseTime = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds
            
            times.push(responseTime);
            
            console.log(`Call ${i + 1}: ${responseTime.toFixed(2)}ms (Status: ${response.statusCode})`);
            
            // Small delay between calls
            if (i < testCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.error(`Call ${i + 1}: ERROR - ${error.message}`);
            times.push(null);
        }
    }
    
    // Analyze results
    const validTimes = times.filter(t => t !== null);
    if (validTimes.length === 0) {
        console.log('\n❌ All API calls failed - server may not be running');
        return;
    }
    
    const firstCall = validTimes[0];
    const warmCalls = validTimes.slice(1);
    const avgWarmTime = warmCalls.reduce((sum, time) => sum + time, 0) / warmCalls.length;
    const minTime = Math.min(...validTimes);
    const maxTime = Math.max(...validTimes);
    
    console.log('\n📊 API Response Time Analysis:');
    console.log('=' .repeat(50));
    console.log(`First call (cold start): ${firstCall.toFixed(2)}ms`);
    console.log(`Average warm calls: ${avgWarmTime.toFixed(2)}ms`);
    console.log(`Minimum time: ${minTime.toFixed(2)}ms`);
    console.log(`Maximum time: ${maxTime.toFixed(2)}ms`);
    console.log(`Total calls: ${validTimes.length}/${testCount}`);
    
    console.log('\n🎯 Target Analysis:');
    console.log('=' .repeat(30));
    console.log(`Target: <20ms`);
    console.log(`Cold start: ${firstCall < 20 ? '✅ PASS' : '❌ FAIL'} (${firstCall.toFixed(2)}ms)`);
    console.log(`Warm average: ${avgWarmTime < 20 ? '✅ PASS' : '❌ FAIL'} (${avgWarmTime.toFixed(2)}ms)`);
    console.log(`Best case: ${minTime < 20 ? '✅ PASS' : '❌ FAIL'} (${minTime.toFixed(2)}ms)`);
    
    // Determine if it's cold start or real bottleneck
    const isColdStartIssue = firstCall > avgWarmTime * 2;
    const isRealBottleneck = avgWarmTime > 20;
    
    console.log('\n🔍 Diagnosis:');
    console.log('=' .repeat(25));
    if (isColdStartIssue && !isRealBottleneck) {
        console.log('✅ COLD START ISSUE - Warm calls are fast enough');
        console.log('💡 Recommendation: Document cold start time, proceed with Phase 3B');
    } else if (isRealBottleneck) {
        console.log('❌ REAL BOTTLENECK - Even warm calls are slow');
        console.log('💡 Recommendation: Investigate middleware, file I/O, or database operations');
        console.log('🔧 Next steps: Check src/server.js for synchronous operations');
    } else {
        console.log('✅ PERFORMANCE ACCEPTABLE - All calls within target');
        console.log('💡 Recommendation: Proceed with Phase 3B');
    }
    
    return {
        firstCall,
        avgWarmTime,
        minTime,
        maxTime,
        isColdStartIssue,
        isRealBottleneck,
        recommendation: isRealBottleneck ? 'OPTIMIZE' : 'PROCEED'
    };
}

// Check server status first
async function checkServerStatus() {
    console.log('🌐 Checking server status...');
    
    try {
        const response = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/',
                method: 'GET',
                timeout: 2000
            }, (res) => {
                resolve({ statusCode: res.statusCode });
            });
            
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            req.end();
        });
        
        console.log(`✅ Server is running (Status: ${response.statusCode})\n`);
        return true;
        
    } catch (error) {
        console.log(`❌ Server not accessible: ${error.message}\n`);
        console.log('💡 Please start the server with: npm start');
        return false;
    }
}

// Run investigation
async function runInvestigation() {
    const serverRunning = await checkServerStatus();
    
    if (serverRunning) {
        const results = await testAPIResponseTimes();
        return results;
    } else {
        return null;
    }
}

// Run the investigation
runInvestigation().then(results => {
    if (results) {
        console.log(`\n🎯 Final Recommendation: ${results.recommendation}`);
    }
    process.exit(0);
}).catch(error => {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
});
