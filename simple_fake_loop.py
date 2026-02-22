#!/usr/bin/env python3
"""
Simple Fake Loop Demo
5 different conditions with decent waits
"""

import time
import random

def check_system_status():
    """Condition 1: Check system status"""
    print("🔍 Checking system status...")
    time.sleep(2)
    
    cpu_usage = random.uniform(20, 80)
    memory_usage = random.uniform(30, 70)
    status = 'healthy' if cpu_usage < 70 and memory_usage < 60 else 'warning'
    
    print(f"✅ System: CPU={cpu_usage:.1f}%, Memory={memory_usage:.1f}% - {status}")
    return {'cpu': cpu_usage, 'memory': memory_usage, 'status': status}

def validate_permissions():
    """Condition 2: Validate permissions"""
    print("👤 Validating permissions...")
    time.sleep(1.5)
    
    has_admin = random.choice([True, False])
    can_write = random.choice([True, True, False])
    valid = has_admin and can_write
    
    print(f"✅ Permissions: Admin={has_admin}, Write={can_write} - {'Valid' if valid else 'Invalid'}")
    return {'admin': has_admin, 'write': can_write, 'valid': valid}

def check_network():
    """Condition 3: Check network"""
    print("🌐 Checking network...")
    time.sleep(2.5)
    
    internet = random.choice([True, True, False])
    latency = random.uniform(10, 100)
    
    print(f"✅ Network: Internet={internet}, Latency={latency:.1f}ms")
    return {'internet': internet, 'latency': latency}

def verify_security():
    """Condition 4: Verify security"""
    print("🔒 Verifying security...")
    time.sleep(1.8)
    
    firewall = random.choice([True, True, False])
    antivirus = random.choice([True, True, False])
    score = (1 if firewall else 0) + (1 if antivirus else 0)
    
    print(f"✅ Security: Firewall={firewall}, Antivirus={antivirus} - Score={score}/2")
    return {'firewall': firewall, 'antivirus': antivirus, 'score': score}

def process_pipeline():
    """Condition 5: Process pipeline"""
    print("⚙️ Processing pipeline...")
    time.sleep(3)
    
    data_size = random.uniform(100, 1000)
    success_rate = random.uniform(0.8, 1.0)
    
    print(f"✅ Pipeline: {data_size:.1f}MB processed, {success_rate:.1%} success")
    return {'size': data_size, 'success': success_rate}

def run_fake_loop():
    """Run the fake loop"""
    print("🚀 Starting Simple Fake Loop Demo")
    print("=" * 50)
    
    for loop_num in range(1, 4):  # 3 loops
        print(f"\n🔄 Loop #{loop_num}")
        print("-" * 30)
        
        # Condition 1
        system = check_system_status()
        if system['status'] == 'warning':
            print("⚠️  System warning, continuing...")
        
        # Condition 2
        perms = validate_permissions()
        if not perms['valid']:
            print("❌ Invalid permissions, stopping")
            break
        
        # Condition 3
        network = check_network()
        if not network['internet']:
            print("❌ No internet, stopping")
            break
        
        # Condition 4
        security = verify_security()
        if security['score'] < 1:
            print("⚠️  Low security, continuing...")
        
        # Condition 5
        pipeline = process_pipeline()
        if pipeline['success'] < 0.5:
            print("❌ Pipeline failed, stopping")
            break
        
        print(f"✅ Loop #{loop_num} completed!")
        
        if loop_num < 3:
            print("⏳ Waiting 3 seconds...")
            time.sleep(3)
    
    print("\n🎉 Demo completed!")

if __name__ == "__main__":
    run_fake_loop()
