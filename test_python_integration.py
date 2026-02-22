#!/usr/bin/env python3
"""
Test script for Runtime Logger Python Integration
Demonstrates real Python code execution through the workflow system
"""

import os
import sys
import time
import threading

# Add the python-agent directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python-agent'))

from runtime_monitor import init_monitor

def test_python_integration():
    """Test the Python integration with Runtime Logger"""
    print("🧪 Testing Runtime Logger Python Integration")
    print("=" * 50)
    
    # Initialize the monitor
    monitor = init_monitor("Test Integration")
    
    # Try to connect
    print("📡 Connecting to Runtime Logger...")
    if not monitor.connect_to_hub():
        print("❌ Failed to connect. Make sure Runtime Logger is running on http://localhost:3000")
        print("   Start the server with: npm start")
        print("   Then start the Python agent with: python python-agent/start_agent.py")
        return False
    
    print("✅ Connected successfully!")
    
    # Test monitored functions
    @monitor.monitor_function()
    def calculate_fibonacci(n):
        """Calculate Fibonacci number"""
        if n <= 1:
            return n
        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)
    
    @monitor.monitor_function()
    def process_text(text, operation='upper'):
        """Process text in various ways"""
        if operation == 'upper':
            return text.upper()
        elif operation == 'lower':
            return text.lower()
        elif operation == 'reverse':
            return text[::-1]
        else:
            return text
    
    @monitor.monitor_function()
    def generate_primes(limit):
        """Generate prime numbers up to limit"""
        primes = []
        for num in range(2, limit + 1):
            is_prime = True
            for i in range(2, int(num ** 0.5) + 1):
                if num % i == 0:
                    is_prime = False
                    break
            if is_prime:
                primes.append(num)
        return primes
    
    print("\n🔄 Running test functions...")
    
    # Test 1: Fibonacci calculation
    print("1. 🧮 Testing Fibonacci calculation...")
    result1 = calculate_fibonacci(10)
    print(f"   Fibonacci(10) = {result1}")
    
    # Test 2: Text processing
    print("2. 📝 Testing text processing...")
    result2 = process_text("Hello Runtime Logger!", "upper")
    print(f"   Text processing result: {result2}")
    
    # Test 3: Prime number generation
    print("3. 🔢 Testing prime number generation...")
    result3 = generate_primes(20)
    print(f"   Primes up to 20: {result3}")
    
    # Test 4: Complex operation
    print("4. 🔄 Testing complex operation...")
    text = "Runtime Logger"
    fib_result = calculate_fibonacci(5)
    processed_text = process_text(f"{text} v{fib_result}", "reverse")
    primes = generate_primes(fib_result + 5)
    print(f"   Complex result: {processed_text}")
    print(f"   Generated {len(primes)} primes")
    
    print("\n✅ All tests completed successfully!")
    print("📊 Check the Runtime Logger dashboard to see the monitored functions.")
    
    # Keep running for a bit to show real-time monitoring
    print("\n⏱️  Monitoring for 10 more seconds...")
    time.sleep(10)
    
    # Disconnect
    monitor.disconnect_from_hub()
    print("👋 Test completed!")
    
    return True

def demonstrate_workflow_nodes():
    """Demonstrate what the workflow nodes can do"""
    print("\n🎯 Workflow Node Capabilities:")
    print("=" * 40)
    
    examples = {
        "Execute Python": [
            "print('Hello from workflow!')",
            "result = [x**2 for x in range(5)]",
            "import math; print(math.pi)"
        ],
        "Monitor Function": [
            "Monitor any Python function in real-time",
            "Track execution time and parameters",
            "Get call statistics and performance data"
        ],
        "Import Module": [
            "import numpy as np",
            "import pandas as pd",
            "import requests"
        ]
    }
    
    for node_type, examples in examples.items():
        print(f"\n📦 {node_type}:")
        for example in examples:
            print(f"   • {example}")

if __name__ == "__main__":
    print("🚀 Runtime Logger Python Integration Test")
    print("This script demonstrates the real Python execution capabilities")
    print("that can be used in the Runtime Logger workflow system.\n")
    
    # Show workflow capabilities
    demonstrate_workflow_nodes()
    
    # Run the actual test
    print("\n" + "=" * 50)
    success = test_python_integration()
    
    if success:
        print("\n🎉 Python integration test completed successfully!")
        print("\n📋 Next steps:")
        print("   1. Start the Runtime Logger server: npm start")
        print("   2. Start the Python agent: python python-agent/start_agent.py")
        print("   3. Open http://localhost:3000/node-editor")
        print("   4. Create a workflow with Python nodes")
        print("   5. Run the workflow to see real Python execution!")
    else:
        print("\n❌ Python integration test failed")
        print("   Please check that the Runtime Logger server is running")
