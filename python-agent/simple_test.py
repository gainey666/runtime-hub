"""
Simple test for Python agent - focuses on connection and basic monitoring
"""

import time
import asyncio
from runtime_monitor import init_monitor, monitor_function

def main():
    print("🚀 Starting Runtime Hub Python Agent Test...")
    
    # Initialize the monitor
    monitor = init_monitor("Simple Test App")
    
    # Wait a moment for connection
    time.sleep(2)
    
    # Define simple workflow structure
    nodes = [
        {'id': 'start', 'name': 'Start Process', 'type': 'workflow', 'x': 100, 'y': 100},
        {'id': 'calculate', 'name': 'Calculate Sum', 'type': 'logic', 'x': 300, 'y': 100},
        {'id': 'validate', 'name': 'Validate Result', 'type': 'data', 'x': 500, 'y': 100},
        {'id': 'save', 'name': 'Save Data', 'type': 'storage', 'x': 700, 'y': 100}
    ]
    
    connections = [
        {'source': 'start', 'target': 'calculate'},
        {'source': 'calculate', 'target': 'validate'},
        {'source': 'validate', 'target': 'save'}
    ]
    
    monitor.define_workflow_nodes(nodes, connections)
    
    print("📊 Workflow nodes defined. Starting function monitoring...")
    
    # Simple monitored function
    @monitor.monitor_function()
    def calculate_sum(a, b):
        """Calculate the sum of two numbers"""
        time.sleep(0.5)  # Simulate work
        result = a + b
        print(f"✅ Calculated: {a} + {b} = {result}")
        return result
    
    @monitor.monitor_function()
    def validate_result(result):
        """Validate the calculation result"""
        time.sleep(0.2)  # Simulate validation
        is_valid = result > 0
        print(f"✅ Validation: {result} is {'valid' if is_valid else 'invalid'}")
        return is_valid
    
    @monitor.monitor_function()
    def save_data(data, is_valid):
        """Save the data"""
        time.sleep(0.3)  # Simulate save
        saved_data = {
            'value': data,
            'valid': is_valid,
            'timestamp': time.time()
        }
        print(f"✅ Saved: {saved_data}")
        return saved_data
    
    # Run the workflow
    print("\n🔄 Running workflow...")
    
    # Step 1: Calculate
    result = calculate_sum(15, 25)
    
    # Step 2: Validate
    is_valid = validate_result(result)
    
    # Step 3: Save
    saved = save_data(result, is_valid)
    
    print("\n🎉 Workflow completed!")
    print("📱 Check the Runtime Hub dashboard at http://localhost:3000")
    print("🔄 The agent will continue running and sending periodic updates...")
    
    # Keep running with periodic updates
    for i in range(10):
        time.sleep(3)
        print(f"📡 Sending periodic update {i+1}/10...")
        
        @monitor.monitor_function()
        def periodic_task(task_id):
            """Periodic task to show live updates"""
            time.sleep(0.1)
            return f"Task {task_id} completed"
        
        periodic_task(i + 1)
    
    print("\n✅ Test completed! Keep the agent running to see more updates.")
    print("🛑 Press Ctrl+C to stop the agent.")

if __name__ == "__main__":
    try:
        main()
        
        # Keep the agent running
        while True:
            time.sleep(5)
            print("📡 Agent still running...")
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down agent...")
        if 'monitor' in locals():
            monitor.disconnect_from_hub()
