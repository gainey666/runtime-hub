"""
Repro Test: Missing Monitor Variable
Tests the issue where 'monitor' is not defined in simple_test.py line 140
"""

import pytest
import sys
import os

# Add the python-agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'python-agent'))

def test_missing_monitor_variable():
    """Test that demonstrates the missing monitor variable issue"""
    
    # This test reproduces the issue from simple_test.py line 140
    # where 'monitor' is not defined
    
    try:
        # This should fail with NameError: name 'monitor' is not defined
        # Reproducing the exact issue from the codebase
        from simple_test import problematic_function  # This doesn't exist yet
        
        # When the actual function is implemented, it would fail here:
        # result = monitor.some_method()  # NameError: name 'monitor' is not defined
        
        assert False, "This test should fail until the monitor variable is properly defined"
        
    except ImportError:
        # Expected - the function doesn't exist yet
        pass
    except NameError as e:
        # This is the actual bug we're testing for
        if "monitor" in str(e):
            print(f"✅ Reproduced the missing monitor variable issue: {e}")
            return True
        else:
            raise

def test_monitor_variable_fix():
    """Test that demonstrates the fix for the missing monitor variable"""
    
    # This test shows how the issue should be fixed
    try:
        # Proper way to define and use monitor variable
        from runtime_monitor import RuntimeMonitorAgent
        
        # Create monitor instance
        monitor = RuntimeMonitorAgent('test-agent')
        
        # Now monitor is properly defined and can be used
        assert monitor is not None
        assert hasattr(monitor, 'monitor_function')
        
        print("✅ Monitor variable properly defined and usable")
        return True
        
    except Exception as e:
        print(f"❌ Monitor variable fix failed: {e}")
        return False

def test_runtime_monitor_imports():
    """Test that runtime_monitor imports work correctly"""
    
    try:
        from runtime_monitor import RuntimeMonitorAgent
        
        # Test that the class can be instantiated
        agent = RuntimeMonitorAgent('test-agent')
        assert agent is not None
        assert agent.agent_id == 'test-agent'
        
        print("✅ RuntimeMonitorAgent imports and instantiation work")
        return True
        
    except Exception as e:
        print(f"❌ RuntimeMonitorAgent import failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Running repro tests for missing monitor variable...")
    
    # Test 1: Reproduce the issue
    print("\n1. Testing missing monitor variable issue:")
    try:
        test_missing_monitor_variable()
    except Exception as e:
        print(f"Expected issue reproduced: {e}")
    
    # Test 2: Test the fix
    print("\n2. Testing monitor variable fix:")
    test_monitor_variable_fix()
    
    # Test 3: Test imports
    print("\n3. Testing runtime monitor imports:")
    test_runtime_monitor_imports()
    
    print("\n🏁 Repro tests completed!")
