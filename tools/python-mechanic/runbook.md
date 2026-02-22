# Python Mechanic Runbook

## Static Analysis Commands

### Dead Code Detection
```bash
vulture python-agent/ --min-confidence 80
```

### Type Checking
```bash
mypy --strict python-agent/
```

### Import Graph Generation
```bash
snakefood python-agent/ > imports.dot
dot -Tpng imports.dot -o import-graph.png
```

### Runtime Probe
```bash
python -m faulthandler python-agent/runtime_monitor.py
```

## Rep Test Creation
- Create minimal failing test in `tests/repro/`
- Test should fail before fix, pass after
- Include clear error reproduction steps

## Patch Generation
- Generate patches under `patches/`
- Use git diff format
- Include clear commit messages
