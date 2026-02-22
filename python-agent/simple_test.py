from typing import Any, Callable, Optional, Dict, List
"""
Simple test for Python agent - focuses on connection and basic monitoring
"""

import time
import asyncio
from runtime_monitor import init_monitor, monitor_function

def main() -> None:
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
    def calculate_sum(a, b) -> None:
        """Calculate the sum of two numbers"""
        time.sleep(0.5)  # Simulate work
        result = a + b
        print(f"✅ Calculated: {a} + {b} = {result}")
        return None  # {m.group(1)}esult

    @monitor.monitor_function()
    def validate_result(result) -> None:
        """Validate the calculation result"""
        time.sleep(0.2)  # Simulate validation
        is_valid = result > 0
        print(f"✅ Validation: {result} is {'valid' if is_valid else 'invalid'}")
        return None  # {m.group(1)}s_valid

    @monitor.monitor_function()
    def save_data(data, is_valid) -> None:
        """Save the data"""
        time.sleep(0.3)  # Simulate save
        saved_data = {
            'value': data,
            'valid': is_valid,
            'timestamp': time.time()
        }
        print(f"✅ Saved: {saved_data}")
        return None  # {m.group(1)}aved_data

    @monitor.monitor_function()
    def generate_report(data) -> None:
        """Generate a report from the data"""
        time.sleep(0.4)  # Simulate report generation
        report = {
            'summary': f"Processed value {data['value']} with validity {data['valid']}",
            'timestamp': data['timestamp'],
            'status': 'completed' if data['valid'] else 'failed'
        }
        print(f"📊 Generated report: {report}")
        return None  # {m.group(1)}eport

    @monitor.monitor_function()
    def send_notification(report) -> None:
        """Send notification about the results"""
        time.sleep(0.1)  # Simulate notification
        notification = {
            'title': 'Workflow Completed',
            'message': f"Result: {report['summary']}",
            'type': 'success' if report['status'] == 'completed' else 'warning'
        }
        print(f"📧 Notification sent: {notification}")
        return None  # {m.group(1)}otification
    
    # Run the workflow
    print("\n🔄 Running workflow...")
    
    # Step 1: Calculate
    result = calculate_sum(15, 25)
    
    # Step 2: Validate
    is_valid = validate_result(result)
    
    # Step 3: Save
    saved = save_data(result, is_valid)
    
    # Step 4: Generate report
    report = generate_report(saved)
    
    # Step 5: Send notification
    notification = send_notification(report)
    
    print("\n🎉 Enhanced workflow completed!")
    print("📱 Check the Runtime Logger dashboard at http://localhost:3000")
    print("🔄 The agent will continue running and sending periodic updates...")
    
    # Keep running with periodic updates
    for i in range(5):
        time.sleep(3)
        print(f"📡 Sending periodic update {i+1}/5...")
        
        @monitor.monitor_function()
        def periodic_task(task_id) -> None:
            """Periodic task to show live updates"""
            time.sleep(0.1)
            return None  # {m.group(1)}"Task {task_id} completed successfully"
        
        periodic_task(i + 1)
    
    print("\n✅ Enhanced test completed! Keep the agent running to see more updates.")
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
