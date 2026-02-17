"""
Runtime Monitor Python Agent
Monitors Python function execution and reports to Runtime Hub
"""

import sys
import socketio
import json
import time
import uuid
import inspect
import traceback
from functools import wraps
from typing import Any, Dict, Callable, Optional
import threading


class RuntimeMonitorAgent:
    """Python agent for monitoring function execution and reporting to Runtime Hub"""
    
    def __init__(self, app_name: str, hub_url: str = "http://localhost:3000"):
        self.app_name = app_name
        self.hub_url = hub_url
        self.sio = socketio.Client()
        self.app_id = None
        self.connected = False
        self.call_stack = []
        self.setup_socket_handlers()
        
    def setup_socket_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        def connect():
            print(f"Connected to Runtime Hub: {self.hub_url}")
            self.connected = True
            # Register the application
            self.sio.emit('register_app', {'name': self.app_name})
            
        @self.sio.event
        def disconnect():
            print("Disconnected from Runtime Hub")
            self.connected = False
            
        @self.sio.event
        def registered(data):
            self.app_id = data['appId']
            print(f"Application registered with ID: {self.app_id}")
            
    def connect_to_hub(self) -> bool:
        """Connect to the Runtime Hub"""
        try:
            self.sio.connect(self.hub_url)
            return True
        except Exception as e:
            print(f"Failed to connect to Runtime Hub: {e}")
            return False
            
    def disconnect_from_hub(self):
        """Disconnect from the Runtime Hub"""
        if self.connected:
            self.sio.disconnect()
            
    def monitor_function(self, func_name: Optional[str] = None):
        """Decorator to monitor function execution"""
        def decorator(func: Callable) -> Callable:
            name = func_name or f"{func.__module__}.{func.__name__}"
            
            @wraps(func)
            def wrapper(*args, **kwargs):
                return self._execute_function(name, func, args, kwargs)
                
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await self._execute_async_function(name, func, args, kwargs)
                
            # Return appropriate wrapper based on function type
            if inspect.iscoroutinefunction(func):
                return async_wrapper
            else:
                return wrapper
                
        return decorator
        
    def _execute_function(self, name: str, func: Callable, args: tuple, kwargs: dict) -> Any:
        """Execute and monitor a synchronous function"""
        call_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Prepare parameter data
        params = self._serialize_parameters(args, kwargs)
        
        # Send function start event
        self._send_execution_event({
            'type': 'call_enter',
            'callId': call_id,
            'functionName': name,
            'timestamp': start_time * 1000,
            'parameters': params
        })
        
        try:
            result = func(*args, **kwargs)
            end_time = time.time()
            duration = (end_time - start_time) * 1000
            
            # Send function success event
            self._send_execution_event({
                'type': 'call_exit',
                'callId': call_id,
                'functionName': name,
                'timestamp': end_time * 1000,
                'duration': duration,
                'success': True,
                'returnValue': self._serialize_value(result)
            })
            
            return result
            
        except Exception as e:
            end_time = time.time()
            duration = (end_time - start_time) * 1000
            
            # Send function error event
            self._send_execution_event({
                'type': 'call_exit',
                'callId': call_id,
                'functionName': name,
                'timestamp': end_time * 1000,
                'duration': duration,
                'success': False,
                'error': str(e),
                'stackTrace': traceback.format_exc()
            })
            
            raise
            
    async def _execute_async_function(self, name: str, func: Callable, args: tuple, kwargs: dict) -> Any:
        """Execute and monitor an asynchronous function"""
        call_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Prepare parameter data
        params = self._serialize_parameters(args, kwargs)
        
        # Send function start event
        self._send_execution_event({
            'type': 'call_enter',
            'callId': call_id,
            'functionName': name,
            'timestamp': start_time * 1000,
            'parameters': params
        })
        
        try:
            result = await func(*args, **kwargs)
            end_time = time.time()
            duration = (end_time - start_time) * 1000
            
            # Send function success event
            self._send_execution_event({
                'type': 'call_exit',
                'callId': call_id,
                'functionName': name,
                'timestamp': end_time * 1000,
                'duration': duration,
                'success': True,
                'returnValue': self._serialize_value(result)
            })
            
            return result
            
        except Exception as e:
            end_time = time.time()
            duration = (end_time - start_time) * 1000
            
            # Send function error event
            self._send_execution_event({
                'type': 'call_exit',
                'callId': call_id,
                'functionName': name,
                'timestamp': end_time * 1000,
                'duration': duration,
                'success': False,
                'error': str(e),
                'stackTrace': traceback.format_exc()
            })
            
            raise
            
    def track_manual_call(self, function_name: str, parameters: dict = None, 
                         return_value: Any = None, error: Exception = None, 
                         start_time: float = None, end_time: float = None):
        """Manually track a function call (for custom monitoring)"""
        if start_time is None:
            start_time = time.time()
        if end_time is None:
            end_time = time.time()
            
        duration = (end_time - start_time) * 1000
        call_id = str(uuid.uuid4())
        
        # Send function start event
        self._send_execution_event({
            'type': 'call_enter',
            'callId': call_id,
            'functionName': function_name,
            'timestamp': start_time * 1000,
            'parameters': parameters or {}
        })
        
        # Send function end event
        event_data = {
            'type': 'call_exit',
            'callId': call_id,
            'functionName': function_name,
            'timestamp': end_time * 1000,
            'duration': duration,
            'success': error is None
        }
        
        if return_value is not None:
            event_data['returnValue'] = self._serialize_value(return_value)
            
        if error is not None:
            event_data['error'] = str(error)
            event_data['stackTrace'] = traceback.format_exc()
            
        self._send_execution_event(event_data)
        
    def define_workflow_nodes(self, nodes: list, connections: list):
        """Define the workflow structure for visualization"""
        if self.connected and self.app_id:
            self.sio.emit('node_data', {
                'nodes': nodes,
                'connections': connections
            })
            
    def _send_execution_event(self, event_data: dict):
        """Send execution event to Runtime Hub"""
        if self.connected and self.app_id:
            self.sio.emit('execution_data', event_data)
        else:
            # Buffer events if not connected (optional)
            print(f"Buffered event (not connected): {event_data}")
            
    def _serialize_parameters(self, args: tuple, kwargs: dict) -> dict:
        """Serialize function parameters for transmission"""
        serialized = {}
        
        # Handle positional arguments
        if args:
            # Try to get parameter names from the calling frame
            try:
                frame = inspect.currentframe().f_back.f_back
                arg_info = inspect.getargvalues(frame)
                
                # Map positional args to parameter names
                for i, arg in enumerate(args):
                    if i < len(arg_info.args):
                        param_name = arg_info.args[i]
                    else:
                        param_name = f"arg_{i}"
                    serialized[param_name] = self._serialize_value(arg)
            except:
                # Fallback: use generic names
                for i, arg in enumerate(args):
                    serialized[f"arg_{i}"] = self._serialize_value(arg)
                    
        # Handle keyword arguments
        for key, value in kwargs.items():
            serialized[key] = self._serialize_value(value)
            
        return serialized
        
    def _serialize_value(self, value: Any) -> Any:
        """Serialize a value for JSON transmission"""
        try:
            # Handle basic types
            if isinstance(value, (str, int, float, bool, type(None))):
                return value
                
            # Handle lists and tuples
            elif isinstance(value, (list, tuple)):
                return [self._serialize_value(item) for item in value[:10]]  # Limit to 10 items
                
            # Handle dictionaries
            elif isinstance(value, dict):
                return {k: self._serialize_value(v) for k, v in list(value.items())[:10]}  # Limit to 10 items
                
            # Handle other objects
            else:
                return {
                    'type': type(value).__name__,
                    'module': getattr(type(value), '__module__', 'unknown'),
                    'repr': str(value)[:200],  # Limit string length
                    'size': len(value) if hasattr(value, '__len__') else None
                }
                
        except Exception:
            return {
                'type': 'serialization_error',
                'repr': str(value)[:100]
            }


# Global agent instance
_global_agent = None

def init_monitor(app_name: str, hub_url: str = "http://localhost:3000") -> RuntimeMonitorAgent:
    """Initialize the global monitor agent"""
    global _global_agent
    _global_agent = RuntimeMonitorAgent(app_name, hub_url)
    _global_agent.connect_to_hub()
    return _global_agent

def get_monitor() -> Optional[RuntimeMonitorAgent]:
    """Get the global monitor agent"""
    return _global_agent

def monitor_function(func_name: Optional[str] = None):
    """Decorator to monitor function execution using global agent"""
    def decorator(func: Callable) -> Callable:
        if _global_agent is None:
            # If no global agent, return function unchanged
            return func
            
        return _global_agent.monitor_function(func_name)(func)
    return decorator

# Example usage and testing
if __name__ == "__main__":
    # Initialize the monitor
    monitor = init_monitor("Test Python App")
    
    # Example monitored functions
    @monitor.monitor_function()
    def calculate_sum(a, b):
        """Calculate the sum of two numbers"""
        time.sleep(0.1)  # Simulate work
        return a + b
    
    @monitor.monitor_function()
    def process_data(data, multiplier=2):
        """Process some data"""
        time.sleep(0.2)  # Simulate work
        return [item * multiplier for item in data]
    
    @monitor.monitor_function()
    async def async_operation(delay):
        """An async operation"""
        await asyncio.sleep(delay)
        return f"Completed after {delay}s"
    
    # Define workflow structure
    nodes = [
        {'id': 'calculate', 'name': 'Calculate Sum', 'type': 'logic', 'x': 100, 'y': 100},
        {'id': 'process', 'name': 'Process Data', 'type': 'data', 'x': 300, 'y': 100},
        {'id': 'async', 'name': 'Async Operation', 'type': 'async', 'x': 500, 'y': 100}
    ]
    
    connections = [
        {'source': 'calculate', 'target': 'process'},
        {'source': 'process', 'target': 'async'}
    ]
    
    monitor.define_workflow_nodes(nodes, connections)
    
    # Run some example operations
    print("Running monitored functions...")
    
    result1 = calculate_sum(5, 3)
    print(f"Sum result: {result1}")
    
    result2 = process_data([1, 2, 3, 4, 5], multiplier=3)
    print(f"Process result: {result2}")
    
    # Test error handling
    try:
        @monitor.monitor_function()
        def error_function():
            raise ValueError("This is a test error")
        
        error_function()
    except Exception as e:
        print(f"Caught expected error: {e}")
    
    # Keep the agent running to see real-time updates
    print("Monitor running... Press Ctrl+C to exit")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down monitor...")
        monitor.disconnect_from_hub()
