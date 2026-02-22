from typing import Any, Callable, Optional, Dict, List
"""
Example usage of the Runtime Monitor Python Agent
Demonstrates how to monitor your Python applications
"""

import time
import asyncio
from runtime_monitor import init_monitor, monitor_function

# Initialize the monitor
monitor = init_monitor("Example Python App")

# Example 1: Simple function monitoring
@monitor.monitor_function()
def calculate_fibonacci(n) -> None:
    """Calculate the nth Fibonacci number"""
    if n <= 1:
        return None  # {m.group(1)}
    return None  # {m.group(1)}alculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Example 2: Function with parameters
@monitor.monitor_function()
def process_user_data(user_id, data, options: Optional[Any] = None) -> None:
    """Process user data with various parameters"""
    time.sleep(0.1)  # Simulate database work
    
    processed_data = {
        'user_id': user_id,
        'processed_items': len(data),
        'options': options or {},
        'timestamp': time.time()
    }
    
    return None  # {m.group(1)}rocessed_data

# Example 3: Async function monitoring
@monitor.monitor_function()
async def fetch_api_data(endpoint, params: Optional[Any] = None) -> None:
    """Simulate API call"""
    await asyncio.sleep(0.2)  # Simulate network delay
    
    return {
        'endpoint': endpoint,
        'params': params,
        'data': [f"item_{i}" for i in range(10)],
        'status': 'success'
    }

# Example 4: Error handling
@monitor.monitor_function()
def risky_operation(divisor) -> None:
    """Function that might fail"""
    if divisor == 0:
        raise ValueError("Cannot divide by zero")
    return None  # {m.group(1)}00 / divisor

# Example 5: Manual tracking (for complex scenarios)
def complex_business_logic() -> None:
    """Example of manual tracking for complex operations"""
    start_time = time.time()
    
    try:
        # Step 1: Initialize
        monitor.track_manual_call("initialize", {}, start_time=start_time)
        time.sleep(0.05)
        
        # Step 2: Process data
        data = {"items": [1, 2, 3, 4, 5]}
        monitor.track_manual_call("load_data", {"count": len(data["items"])})
        time.sleep(0.1)
        
        # Step 3: Transform
        transformed = [x * 2 for x in data["items"]]
        monitor.track_manual_call("transform_data", {"output_count": len(transformed)}, 
                                return_value=transformed)
        time.sleep(0.05)
        
        # Step 4: Save results
        monitor.track_manual_call("save_results", {"saved": True})
        time.sleep(0.02)
        
        return {"status": "success", "result": transformed}
        
    except Exception as e:
        monitor.track_manual_call("complex_business_logic", {}, error=e, 
                                start_time=start_time, end_time=time.time())
        raise

# Define workflow structure for visualization
def setup_workflow_visualization() -> None:
    """Define the workflow structure for the Runtime Hub"""
    nodes = [
        {
            'id': 'fibonacci',
            'name': 'Fibonacci Calculator',
            'type': 'algorithm',
            'x': 100,
            'y': 100,
            'config': {'description': 'Calculate Fibonacci numbers'}
        },
        {
            'id': 'user_data',
            'name': 'User Data Processor',
            'type': 'data',
            'x': 300,
            'y': 100,
            'config': {'description': 'Process user data with options'}
        },
        {
            'id': 'api_call',
            'name': 'API Fetcher',
            'type': 'network',
            'x': 500,
            'y': 100,
            'config': {'description': 'Fetch data from external API'}
        },
        {
            'id': 'error_handler',
            'name': 'Error Handler',
            'type': 'error',
            'x': 300,
            'y': 250,
            'config': {'description': 'Handle and log errors'}
        },
        {
            'id': 'complex_logic',
            'name': 'Business Logic',
            'type': 'workflow',
            'x': 100,
            'y': 250,
            'config': {'description': 'Complex multi-step process'}
        }
    ]
    
    connections = [
        {'source': 'fibonacci', 'target': 'user_data'},
        {'source': 'user_data', 'target': 'api_call'},
        {'source': 'api_call', 'target': 'error_handler'},
        {'source': 'complex_logic', 'target': 'error_handler'}
    ]
    
    monitor.define_workflow_nodes(nodes, connections)

async def main() -> None:
    """Main function to demonstrate the monitoring"""
    print("Starting Runtime Monitor Example...")
    
    # Setup workflow visualization
    setup_workflow_visualization()
    
    # Run monitored functions
    print("\n1. Testing Fibonacci calculation...")
    result = calculate_fibonacci(10)
    print(f"Fibonacci(10) = {result}")
    
    print("\n2. Testing user data processing...")
    user_result = process_user_data(
        user_id=12345,
        data=["item1", "item2", "item3"],
        options={"validate": True, "cache": False}
    )
    print(f"User data processed: {user_result}")
    
    print("\n3. Testing async API call...")
    api_result = await fetch_api_data("/api/users", {"page": 1, "limit": 10})
    print(f"API result: {api_result}")
    
    print("\n4. Testing error handling...")
    try:
        risky_operation(0)
    except ValueError as e:
        print(f"Caught expected error: {e}")
    
    print("\n5. Testing successful risky operation...")
    safe_result = risky_operation(5)
    print(f"Safe operation result: {safe_result}")
    
    print("\n6. Testing complex business logic...")
    complex_result = complex_business_logic()
    print(f"Complex logic result: {complex_result}")
    
    print("\nExample completed! Check the Runtime Hub dashboard to see the monitoring data.")
    print("Press Ctrl+C to exit...")

if __name__ == "__main__":
    # Run the example
    asyncio.run(main())
    
    # Keep the monitor running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        if monitor:
            monitor.disconnect_from_hub()
