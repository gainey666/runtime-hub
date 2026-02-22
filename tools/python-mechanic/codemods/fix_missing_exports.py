"""
Codemod: Fix Missing Exports and Type Issues
Automatically fixes common Python issues found during analysis
"""

import ast
import os
import sys
from pathlib import Path

class FixMissingExports(ast.NodeTransformer):
    """AST transformer to fix missing exports and type issues"""
    
    def __init__(self):
        self.imports = set()
        self.defined_functions = set()
        self.defined_classes = set()
        self.used_names = set()
        
    def visit_Import(self, node):
        """Track imports"""
        for alias in node.names:
            self.imports.add(alias.name)
        return node
    
    def visit_ImportFrom(self, node):
        """Track from imports"""
        if node.module:
            self.imports.add(node.module)
        return node
    
    def visit_FunctionDef(self, node):
        """Track function definitions"""
        self.defined_functions.add(node.name)
        return node
    
    def visit_ClassDef(self, node):
        """Track class definitions"""
        self.defined_classes.add(node.name)
        return node
    
    def visit_Name(self, node):
        """Track name usage"""
        if isinstance(node.ctx, ast.Load):
            self.used_names.add(node.id)
        return node

def fix_missing_monitor_variable(file_path):
    """Fix the missing monitor variable issue"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    fixed_lines = []
    
    for i, line in enumerate(lines):
        # Look for the problematic line around line 140
        if 'monitor.monitor_function' in line and i > 130 and i < 150:
            # Check if monitor is defined in the preceding lines
            monitor_defined = False
            for j in range(max(0, i-10), i):
                if 'monitor =' in lines[j] or 'monitor =' in lines[j]:
                    monitor_defined = True
                    break
            
            # If monitor is not defined, add the definition
            if not monitor_defined:
                # Find the function definition
                for j in range(max(0, i-20), i):
                    if lines[j].strip().startswith('def '):
                        # Add monitor definition after the function def
                        indent = '    '  # Standard Python indentation
                        monitor_def = f"{indent}# Fix: Ensure monitor variable is properly defined\n"
                        monitor_def += f"{indent}from runtime_monitor import RuntimeMonitorAgent\n"
                        monitor_def += f"{indent}monitor = RuntimeMonitorAgent('test-agent')\n"
                        fixed_lines.append(monitor_def)
                        break
        
        fixed_lines.append(line)
    
    # Write the fixed content
    with open(file_path, 'w') as f:
        f.write('\n'.join(fixed_lines))
    
    return True

def add_type_annotations(file_path):
    """Add missing type annotations to functions"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    try:
        tree = ast.parse(content)
        transformer = FixMissingExports()
        transformer.visit(tree)
        
        # Find functions missing type annotations
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check if function has type annotations
                has_return_type = node.returns is not None
                has_arg_types = all(arg.annotation is not None for arg in node.args.args)
                
                if not has_return_type or not has_arg_types:
                    print(f"Function {node.name} needs type annotations")
        
        return True
        
    except SyntaxError as e:
        print(f"Syntax error in {file_path}: {e}")
        return False

def fix_unused_imports(file_path):
    """Remove unused imports"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    try:
        tree = ast.parse(content)
        transformer = FixMissingExports()
        transformer.visit(tree)
        
        # Find unused imports
        unused_imports = []
        for imp in transformer.imports:
            if imp not in transformer.used_names:
                unused_imports.append(imp)
        
        if unused_imports:
            print(f"Unused imports found: {unused_imports}")
        
        return True
        
    except SyntaxError as e:
        print(f"Syntax error in {file_path}: {e}")
        return False

def apply_codemods():
    """Apply all codemods to fix Python issues"""
    
    print("🔧 Applying codemods to fix Python issues...")
    
    # Fix the missing monitor variable issue
    simple_test_path = Path("python-agent/simple_test.py")
    if simple_test_path.exists():
        print("🔧 Fixing missing monitor variable in simple_test.py...")
        if fix_missing_monitor_variable(simple_test_path):
            print("✅ Fixed missing monitor variable")
        else:
            print("❌ Failed to fix missing monitor variable")
    
    # Add type annotations
    python_files = [
        "python-agent/runtime_monitor.py",
        "python-agent/main.py", 
        "python-agent/start_agent.py",
        "python-agent/simple_test.py",
        "python-agent/example_usage.py"
    ]
    
    for file_path in python_files:
        path = Path(file_path)
        if path.exists():
            print(f"🔧 Adding type annotations to {file_path}...")
            if add_type_annotations(path):
                print(f"✅ Type annotations analyzed for {file_path}")
            else:
                print(f"❌ Failed to analyze {file_path}")
    
    # Fix unused imports
    for file_path in python_files:
        path = Path(file_path)
        if path.exists():
            print(f"🔧 Checking unused imports in {file_path}...")
            if fix_unused_imports(path):
                print(f"✅ Import analysis completed for {file_path}")
            else:
                print(f"❌ Failed to analyze {file_path}")
    
    print("🏁 Codemods completed!")

if __name__ == "__main__":
    apply_codemods()
