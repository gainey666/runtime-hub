#!/usr/bin/env python3
"""
Python Mechanic Codemod: Fix Type Annotations
Add missing type annotations to satisfy mypy --strict
"""
import ast
import sys
from pathlib import Path

def fix_function_annotations(file_path: str) -> None:
    """Add missing type annotations to functions"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex fixes for common patterns
    fixes = [
        # Add return type to main functions
        (r'def main\(\):', 'def main() -> None:'),
        (r'def main\(\s*\):', 'def main() -> None:'),
        
        # Add return type to simple functions
        (r'def ([a-zA-Z_][a-zA-Z0-9_]*)\(\s*\):', r'def \1() -> None:'),
        
        # Add type annotations to common parameters
        (r'def ([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\):', lambda m: f'def {m.group(1)}({m.group(2)}) -> None:'),
    ]
    
    for pattern, replacement in fixes:
        if callable(replacement):
            content = re.sub(pattern, replacement, content)
        else:
            content = re.sub(pattern, replacement, content)
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    import re
    
    # Fix all Python files in python-agent
    python_files = Path("python-agent").glob("*.py")
    
    for file_path in python_files:
        print(f"Fixing type annotations in {file_path}")
        fix_function_annotations(str(file_path))
    
    print("✅ Type annotation fixes completed")
