"""
Repro test for dead code issues in python-agent
This test should fail before the fix and pass after.
"""
import pytest
import sys
import os

# Add the python-agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'python-agent'))

def test_unused_imports():
    """Test that unused imports are removed"""
    
    # This should fail before the fix due to unused imports
    try:
        import runtime_monitor
        import example_usage
        
        # Check that runtime_monitor doesn't have unused imports
        import ast
        with open('python-agent/runtime_monitor.py', 'r') as f:
            tree = ast.parse(f.read())
        
        imports = [node.names[0].name for node in ast.walk(tree) if isinstance(node, ast.Import)]
        unused_found = any(imp in ['subprocess', 'tempfile'] for imp in imports)
        
        if unused_found:
            pytest.fail("Found unused imports: subprocess, tempfile")
        
        # Check example_usage doesn't have unused imports
        with open('python-agent/example_usage.py', 'r') as f:
            tree = ast.parse(f.read())
        
        imports = [node.names[0].name for node in ast.walk(tree) if isinstance(node, ast.Import)]
        unused_found = any(imp in ['get_monitor'] for imp in imports)
        
        if unused_found:
            pytest.fail("Found unused import: get_monitor")
            
    except ImportError as e:
        pytest.fail(f"Import error: {e}")

if __name__ == "__main__":
    test_unused_imports()
    print("✅ Dead code fix verified")
