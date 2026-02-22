#!/usr/bin/env python3
"""
Fake Loop Demo for Runtime Logger
Creates a loop with 5 different conditions and waits
"""

import time
import random
import sys
import os

# Add the python-agent directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python-agent'))

from runtime_monitor import init_monitor, monitor_function

# Initialize the monitor
monitor = init_monitor("Fake Loop Demo")

@monitor.monitor_function()
def check_system_status():
    """Check system status - Condition 1"""
    print("🔍 Checking system status...")
    time.sleep(2)  # Decent wait
    
    # Random system status
    cpu_usage = random.uniform(20, 80)
    memory_usage = random.uniform(30, 70)
    disk_space = random.uniform(40, 90)
    
    status = {
        'cpu_usage': cpu_usage,
        'memory_usage': memory_usage,
        'disk_space': disk_space,
        'status': 'healthy' if cpu_usage < 70 and memory_usage < 60 else 'warning'
    }
    
    print(f"✅ System status: CPU={cpu_usage:.1f}%, Memory={memory_usage:.1f}%, Disk={disk_space:.1f}%")
    return status

@monitor.monitor_function()
def validate_user_permissions(status):
    """Validate user permissions - Condition 2"""
    print("👤 Validating user permissions...")
    time.sleep(1.5)  # Decent wait
    
    # Simulate permission check
    has_admin = random.choice([True, False])
    can_write = random.choice([True, False])
    can_execute = random.choice([True, True])  # Usually true
    
    permissions = {
        'has_admin': has_admin,
        'can_write': can_write,
        'can_execute': can_execute,
        'valid': has_admin and can_write
    }
    
    print(f"✅ Permissions: Admin={has_admin}, Write={can_write}, Execute={can_execute}")
    return permissions

@monitor.monitor_function()
def check_network_connectivity(permissions):
    """Check network connectivity - Condition 3"""
    print("🌐 Checking network connectivity...")
    time.sleep(2.5)  # Decent wait
    
    # Simulate network checks
    internet_available = random.choice([True, True, False])  # Usually true
    latency = random.uniform(10, 100)
    bandwidth = random.uniform(1, 100)
    
    network = {
        'internet_available': internet_available,
        'latency_ms': latency,
        'bandwidth_mbps': bandwidth,
        'connection_quality': 'good' if latency < 50 and bandwidth > 50 else 'poor'
    }
    
    print(f"✅ Network: Internet={internet_available}, Latency={latency:.1f}ms, Bandwidth={bandwidth:.1f}Mbps")
    return network

@monitor.monitor_function()
def verify_security_settings(network):
    """Verify security settings - Condition 4"""
    print("🔒 Verifying security settings...")
    time.sleep(1.8)  # Decent wait
    
    # Simulate security checks
    firewall_enabled = random.choice([True, True, False])  # Usually true
    antivirus_active = random.choice([True, True, False])
    encryption_enabled = random.choice([True, False])
    
    security = {
        'firewall_enabled': firewall_enabled,
        'antivirus_active': antivirus_active,
        'encryption_enabled': encryption_enabled,
        'security_score': (1 if firewall_enabled else 0) + (1 if antivirus_active else 0) + (1 if encryption_enabled else 0)
    }
    
    print(f"✅ Security: Firewall={firewall_enabled}, Antivirus={antivirus_active}, Encryption={encryption_enabled}")
    return security

@monitor.monitor_function()
def process_data_pipeline(security):
    """Process data pipeline - Condition 5"""
    print("⚙️ Processing data pipeline...")
    time.sleep(3)  # Longer wait for processing
    
    # Simulate data processing
    data_size = random.uniform(100, 1000)
    processing_time = data_size / 100  # Simulate processing time
    success_rate = random.uniform(0.8, 1.0)
    
    pipeline = {
        'data_size_mb': data_size,
        'processing_time_sec': processing_time,
        'success_rate': success_rate,
        'processed_items': int(data_size * success_rate)
    }
    
    print(f"✅ Pipeline: {data_size:.1f}MB processed in {processing_time:.1f}s, {success_rate:.1%} success rate")
    return pipeline

@monitor.monitor_function()
def generate_final_report(pipeline):
    """Generate final report"""
    print("📊 Generating final report...")
    time.sleep(1)  # Short wait
    
    report = {
        'timestamp': time.time(),
        'summary': 'System check completed',
        'total_checks': 5,
        'status': 'success' if pipeline['success_rate'] > 0.9 else 'partial'
    }
    
    print(f"🎉 Final report: {report['summary']} - Status: {report['status']}")
    return report

def run_fake_loop():
    """Run the fake loop with conditions"""
    print("🚀 Starting Fake Loop Demo")
    print("=" * 50)
    
    loop_count = 0
    max_loops = 3  # Run 3 times to see the pattern
    
    try:
        while loop_count < max_loops:
            loop_count += 1
            print(f"\n🔄 Loop #{loop_count}")
            print("-" * 30)
            
            # Condition 1: Check system status
            status = check_system_status()
            if status['status'] == 'warning':
                print("⚠️  System status warning, but continuing...")
            
            # Condition 2: Validate permissions
            permissions = validate_user_permissions(status)
            if not permissions['valid']:
                print("❌ Invalid permissions, stopping loop")
                break
            
            # Condition 3: Check network
            network = check_network_connectivity(permissions)
            if not network['internet_available']:
                print("❌ No internet connection, stopping loop")
                break
            
            # Condition 4: Verify security
            security = verify_security_settings(network)
            if security['security_score'] < 2:
                print("⚠️  Low security score, but continuing...")
            
            # Condition 5: Process pipeline
            pipeline = process_data_pipeline(security)
            if pipeline['success_rate'] < 0.5:
                print("❌ Pipeline failed, stopping loop")
                break
            
            # Generate report
            report = generate_final_report(pipeline)
            
            print(f"✅ Loop #{loop_count} completed successfully!")
            
            # Wait between loops
            if loop_count < max_loops:
                print("⏳ Waiting 5 seconds before next loop...")
                time.sleep(5)
        
        print(f"\n🎉 Fake loop demo completed! Ran {loop_count} loops.")
        
    except KeyboardInterrupt:
        print("\n⏹️  Demo stopped by user")
    except Exception as e:
        print(f"\n❌ Demo error: {e}")
    
    print("\n📱 Check the Runtime Logger dashboard to see all the monitoring data!")
    print("🔄 The agent will continue running...")

if __name__ == "__main__":
    # Connect to the hub first
    print("📡 Connecting to Runtime Logger...")
    if monitor.connect_to_hub():
        print("✅ Connected! Starting demo...")
        run_fake_loop()
        
        # Keep the agent running
        try:
            while True:
                time.sleep(10)
                print("📡 Agent still running... Press Ctrl+C to stop")
        except KeyboardInterrupt:
            print("\n🛑 Shutting down...")
            monitor.disconnect_from_hub()
    else:
        print("❌ Failed to connect to Runtime Logger")
        print("   Make sure the server is running on http://localhost:3000")
