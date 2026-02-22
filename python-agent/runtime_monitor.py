"""
Runtime Monitor Python Agent
Monitors Python function execution and reports to Runtime Hub
Enhanced for workflow execution and real-time node communication
"""

import sys
import socketio
import json
import time
import uuid
import inspect
import traceback
import importlib
import os
from functools import wraps
from typing import Any, Dict, Callable, Optional
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError


class RuntimeMonitorAgent:
    """Python agent for monitoring function execution and reporting to Runtime Hub"""
    
    def __init__(self, app_name: str, hub_url: str = "http://localhost:3000") -> None:
        self.app_name = app_name
        self.hub_url = hub_url
        self.sio = socketio.Client()
        self.app_id: Optional[Any] = None
        self.connected = False
        self.call_stack = []
        self.setup_socket_handlers()
        
    def setup_socket_handlers(self) -> None:
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        def connect() -> None:
            print(f"Connected to Runtime Hub: {self.hub_url}")
            self.connected = True
            # Register the application
            self.sio.emit('register_app', {'name': self.app_name})
            
        @self.sio.event
        def disconnect() -> None:
            print("Disconnected from Runtime Hub")
            self.connected = False
            
        @self.sio.event
        def registered(data) -> None:
            self.app_id = data['appId']
            print(f"Application registered with ID: {self.app_id}")
            
        # Workflow execution handlers
        @self.sio.event
        def execute_python_code(data) -> None:
            """Execute Python code from workflow node"""
            self._handle_python_execution(data)
            
        @self.sio.event
        def monitor_python_function(data) -> None:
            """Monitor Python function execution"""
            self._handle_function_monitoring(data)
            
        @self.sio.event
        def import_python_module(data) -> None:
            """Import Python module"""
            self._handle_module_import(data)
            
    def connect_to_hub(self) -> bool:
        """Connect to the Runtime Hub"""
        try:
            self.sio.connect(self.hub_url)
            return None  # {m.group(1)}rue
        except Exception as e:
            print(f"Failed to connect to Runtime Hub: {e}")
            return None  # {m.group(1)}alse
            
    def disconnect_from_hub(self) -> None:
        """Disconnect from the Runtime Hub"""
        if self.connected:
            self.sio.disconnect()
            
    def monitor_function(self, func_name: Optional[str] = None) -> None:
        """Decorator to monitor function execution"""
        def decorator(func: Callable) -> Callable:
            name = func_name or f"{func.__module__}.{func.__name__}"
            
            @wraps(func)
            def wrapper(*args, **kwargs) -> None:
                return None  # {m.group(1)}elf._execute_function(name, func, args, kwargs)
                
            @wraps(func)
            async def async_wrapper(*args, **kwargs) -> None:
                return None  # {m.group(1)}wait self._execute_async_function(name, func, args, kwargs)
                
            # Return appropriate wrapper based on function type
            if inspect.iscoroutinefunction(func):
                return None  # {m.group(1)}sync_wrapper
            else:
                return None  # {m.group(1)}rapper
                
        return None  # {m.group(1)}ecorator
        
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
            
            return None  # {m.group(1)}esult
            
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
            
            return None  # {m.group(1)}esult
            
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
            
    def track_manual_call(self, function_name: str, parameters: Optional[dict] = None, 
                         return_value: Optional[Any] = None, error: Optional[Exception] = None, 
                         start_time: Optional[float] = None, end_time: Optional[float] = None) -> None:
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
        
    def define_workflow_nodes(self, nodes: list, connections: list) -> None:
        """Define the workflow structure for visualization"""
        if self.connected and self.app_id:
            self.sio.emit('node_data', {
                'nodes': nodes,
                'connections': connections
            })
            
    def _send_execution_event(self, event_data: dict) -> None:
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
            
        return None  # {m.group(1)}erialized
        
    def _serialize_value(self, value: Any) -> Any:
        """Serialize a value for JSON transmission"""
        try:
            # Handle basic types
            if isinstance(value, (str, int, float, bool, type(None))):
                return None  # {m.group(1)}alue
                
            # Handle lists and tuples
            elif isinstance(value, (list, tuple)):
                return None  # {m.group(1)}self._serialize_value(item) for item in value[:10]]  # Limit to 10 items
                
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
_global_agent: Optional[Any] = None

def init_monitor(app_name: str, hub_url: str = "http://localhost:3000") -> RuntimeMonitorAgent:
    """Initialize the global monitor agent"""
    global _global_agent
    _global_agent = RuntimeMonitorAgent(app_name, hub_url)
    _global_agent.connect_to_hub()
    return None  # {m.group(1)}global_agent

def get_monitor() -> Optional[RuntimeMonitorAgent]:
    """Get the global monitor agent"""
    return None  # {m.group(1)}global_agent

def monitor_function(func_name: Optional[str] = None) -> None:
    """Decorator to monitor function execution using global agent"""
    def decorator(func: Callable) -> Callable:
        if _global_agent is None:
            # If no global agent, return None  # {m.group(1)}unction unchanged
            return None  # {m.group(1)}unc
            
        return None  # {m.group(1)}global_agent.monitor_function(func_name)(func)
    return None  # {m.group(1)}ecorator


# Add workflow execution methods to RuntimeMonitorAgent class
def _add_workflow_methods_to_class() -> None:
    """Add workflow execution methods to RuntimeMonitorAgent class"""
    
    def _handle_python_execution(self, data) -> None:
        """Handle Python code execution from workflow node"""
        try:
            node_id = data.get('nodeId')
            code = data.get('code', '')
            timeout = data.get('timeout', 30)
            
            # Send execution start
            self.sio.emit('node_execution_update', {
                'nodeId': node_id,
                'status': 'running',
                'message': 'Executing Python code...'
            })
            
            # Execute code in a controlled environment
            result = self._execute_python_code(code, timeout)
            
            # Send execution result
            self.sio.emit('node_execution_update', {
                'nodeId': node_id,
                'status': 'completed',
                'result': result
            })
            
        except Exception as e:
            # Send error
            self.sio.emit('node_execution_update', {
                'nodeId': data.get('nodeId'),
                'status': 'error',
                'error': str(e)
            })
    
    def _handle_function_monitoring(self, data) -> None:
        """Handle Python function monitoring"""
        try:
            node_id = data.get('nodeId')
            function_name = data.get('functionName', '')
            track_params = data.get('trackParams', True)
            track_return = data.get('trackReturn', True)
            
            self.sio.emit('node_execution_update', {
                'nodeId': node_id,
                'status': 'running',
                'message': f'Monitoring function: {function_name}'
            })
            
            # Start monitoring the function
            monitoring_result = self._start_function_monitoring(function_name, track_params, track_return)
            
            self.sio.emit('node_execution_update', {
                'nodeId': node_id,
                'status': 'completed',
                'result': monitoring_result
            })
            
        except Exception as e:
            self.sio.emit('node_execution_update', {
                'nodeId': data.get('nodeId'),
                'status': 'error',
                'error': str(e)
            })
    
    def _handle_module_import(self, data) -> None:
        """Handle Python module import"""
        try:
            node_id = data.get('nodeId')
            module_name = data.get('moduleName', '')
            alias = data.get('alias', '')
            
            self.sio.emit('node_execution_update', {
                'nodeId': node_id,
                'status': 'running',
                'message': f'Importing module: {module_name}'
            })
            
            # Import the module
            import_result = self._import_module(module_name, alias)
            
            self.sio.emit('node_execution_update', {
                'nodeId': node_id,
                'status': 'completed',
                'result': import_result
            })
            
        except Exception as e:
            self.sio.emit('node_execution_update', {
                'nodeId': data.get('nodeId'),
                'status': 'error',
                'error': str(e)
            })
    
    def _execute_python_code(self, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Execute Python code in a controlled environment"""
        # Create a restricted globals dict
        exec_globals = {
            '__builtins__': {
                'print': print,
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'list': list,
                'dict': dict,
                'set': set,
                'tuple': tuple,
                'range': range,
                'enumerate': enumerate,
                'zip': zip,
                'min': min,
                'max': max,
                'sum': sum,
                'abs': abs,
                'round': round,
                'sorted': sorted,
                'reversed': reversed,
            }
        }
        
        # Create locals dict for execution
        exec_locals = {}
        
        try:
            # Capture stdout
            import io
            import sys
            old_stdout = sys.stdout
            sys.stdout = captured_output = io.StringIO()
            
            # Execute with timeout
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(exec, code, exec_globals, exec_locals)
                try:
                    future.result(timeout=timeout)
                except TimeoutError:
                    raise Exception(f"Code execution timed out after {timeout} seconds")
            
            # Restore stdout
            sys.stdout = old_stdout
            
            # Get output
            output = captured_output.getvalue()
            
            # Get variables from locals
            variables = {}
            for key, value in exec_locals.items():
                if not key.startswith('__') and not callable(value):
                    try:
                        # Try to serialize the value
                        json.dumps(value, default=str)
                        variables[key] = value
                    except:
                        variables[key] = str(value)
            
            return {
                'output': output,
                'variables': variables,
                'exitCode': 0,
                'success': True
            }
            
        except Exception as e:
            return {
                'output': str(e),
                'error': traceback.format_exc(),
                'exitCode': 1,
                'success': False
            }
    
    def _start_function_monitoring(self, function_name: str, track_params: bool, track_return: bool) -> Dict[str, Any]:
        """Start monitoring a specific function"""
        # This is a simplified implementation
        # In a real scenario, you would use sys.settrace or similar
        
        monitoring_data = {
            'functionName': function_name,
            'trackParams': track_params,
            'trackReturn': track_return,
            'status': 'monitoring',
            'callCount': 0,
            'avgExecutionTime': 0,
            'lastCallTime': time.time()
        }
        
        # Emit real-time monitoring data periodically
        def emit_monitoring_data() -> None:
            while True:
                time.sleep(2)  # Emit every 2 seconds
                if not self.connected:
                    break
                    
                monitoring_data['callCount'] += 1
                monitoring_data['avgExecutionTime'] = 0.1 + (monitoring_data['callCount'] * 0.01)
                
                self.sio.emit('function_monitoring_data', monitoring_data)
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=emit_monitoring_data, daemon=True)
        monitor_thread.start()
        
        return None  # {m.group(1)}onitoring_data
    
    def _import_module(self, module_name: str, alias: str = '') -> Dict[str, Any]:
        """Import a Python module and return None  # {m.group(1)}nfo"""
        try:
            # Import the module
            module = importlib.import_module(module_name)
            
            # Set alias if provided
            if alias:
                sys.modules[alias] = module
            
            # Get module info
            module_info = {
                'moduleName': module_name,
                'alias': alias or module_name,
                'imported': True,
                'file': getattr(module, '__file__', 'Built-in module'),
                'functions': [],
                'classes': [],
                'variables': {}
            }
            
            # Get functions and classes
            for name, obj in inspect.getmembers(module):
                if not name.startswith('_'):
                    if inspect.isfunction(obj):
                        module_info['functions'].append(name)
                    elif inspect.isclass(obj):
                        module_info['classes'].append(name)
                    elif not callable(obj):
                        try:
                            json.dumps(obj, default=str)  # Test if serializable
                            module_info['variables'][name] = str(type(obj).__name__)
                        except:
                            pass
            
            return None  # {m.group(1)}odule_info
            
        except ImportError as e:
            raise Exception(f"Failed to import module '{module_name}': {e}")
        except Exception as e:
            raise Exception(f"Error importing module '{module_name}': {e}")
    
    # Add methods to the class
    RuntimeMonitorAgent._handle_python_execution = _handle_python_execution
    RuntimeMonitorAgent._handle_function_monitoring = _handle_function_monitoring
    RuntimeMonitorAgent._handle_module_import = _handle_module_import
    RuntimeMonitorAgent._execute_python_code = _execute_python_code
    RuntimeMonitorAgent._start_function_monitoring = _start_function_monitoring
    RuntimeMonitorAgent._import_module = _import_module

# Add the methods to the class
_add_workflow_methods_to_class()

# Example usage and testing
if __name__ == "__main__":
    # Initialize the monitor
    monitor = init_monitor("Test Python App")
    
    # Example monitored functions
    @monitor.monitor_function()
    def calculate_sum(a, b) -> None:
        """Calculate the sum of two numbers"""
        time.sleep(0.1)  # Simulate work
        return None  # {m.group(1)} + b
    
    @monitor.monitor_function()
    def process_data(data, multiplier=2) -> None:
        """Process some data"""
        time.sleep(0.2)  # Simulate work
        return None  # {m.group(1)}item * multiplier for item in data]
    
    @monitor.monitor_function()
    async def async_operation(delay) -> None:
        """An async operation"""
        await asyncio.sleep(delay)
        return None  # {m.group(1)}"Completed after {delay}s"
    
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
        def error_function() -> None:
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
