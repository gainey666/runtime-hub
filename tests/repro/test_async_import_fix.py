"""
Repro test for missing asyncio import in runtime_monitor.py
This test should fail before the fix and pass after.
"""
import pytest
import sys
import os

# Add the python-agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'python-agent'))

def test_async_import_issue():
    """Test that async operations work without import errors"""
    
    # This should fail before the fix due to missing asyncio import
    try:
        from runtime_monitor import init_monitor, monitor_function
        
        # Initialize monitor
        monitor = init_monitor("Test App")
        
        # Define async function using the decorator
        @monitor_function()
        async def test_async_func(delay: float) -> str:
            import asyncio  # This import should be at module level
            await asyncio.sleep(0.01)
            return f"Completed after {delay}s"
        
        # This should work if the import is fixed
        import asyncio
        result = asyncio.run(test_async_func(0.1))
        assert result == "Completed after 0.1s"
        
    except NameError as e:
        if "asyncio" in str(e):
            pytest.fail(f"Missing asyncio import: {e}")
        else:
            raise

if __name__ == "__main__":
    test_async_import_issue()
    print("✅ Async import fix verified")
