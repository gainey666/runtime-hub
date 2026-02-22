# 🤝 Contributing to Runtime Hub

## Quick Start for Contributors

### 1. Setup
```bash
git clone https://github.com/gainey666/runtime-hub.git
cd runtime-hub
npm install
```

### 2. Start Development
```bash
# Option 1: One-click (recommended)
./start.sh          # Linux/Mac
start.bat           # Windows

# Option 2: Manual
npm run server      # Terminal 1
npm run api         # Terminal 2
```

### 3. Run Tests
```bash
npm run test:quick  # Fast integration tests (9/10 passing)
npm test            # Full test suite
```

---

## Development Workflow

### Before Making Changes:
1. Pull latest code: `git pull origin master`
2. Create branch: `git checkout -b feature/your-feature`
3. Run tests: `npm run test:quick`

### While Developing:
1. Make your changes
2. Test locally (use test-everything.js)
3. Check TypeScript: `npx tsc --noEmit`
4. Check syntax: `node -c yourfile.js`

### Before Committing:
```bash
# Run all checks
npm run test:quick
npx tsc --noEmit
```

### Commit Format:
```bash
git commit -m "type: brief description

- Change 1
- Change 2

Fixes #123"
```

**Types:** feat, fix, docs, style, refactor, test, chore

---

## Code Standards

### JavaScript/TypeScript:
- Use const/let, not var
- Arrow functions preferred
- Async/await over callbacks
- Meaningful variable names
- Add comments for complex logic

### Functions:
- Keep functions small (< 50 lines)
- Single responsibility
- Return early on errors
- Handle all edge cases

### Error Handling:
```javascript
// Good
try {
  const result = await doSomething();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

---

## Testing Guidelines

### Integration Tests:
Add tests to `test-everything.js`:
```javascript
test('Your feature name', async () => {
  const res = await makeRequest({...});
  if (res.status !== 200) throw new Error('Failed');
});
```

### Test Your Changes:
```bash
# Quick validation
npm run test:quick

# Full suite
npm test

# Specific test
node test-everything.js
```

---

## File Organization

```
src/
├── server.js           # Main server (don't break imports!)
├── auto-clicker-api.js # Auto-clicker API
├── config/            # Configuration
├── core/              # Core logic
├── middleware/        # Express middleware
├── types/             # TypeScript types
└── utils/             # Helper functions

public/
├── node-editor.html   # Main UI (1750+ lines)
├── node-library.js    # Node definitions
└── error-logger.js    # Error handling

tests/
└── [test files]       # Unit/integration tests
```

---

## Common Tasks

### Add New Node Type:
Edit `public/node-library.js`:
```javascript
this.addNode({
  category: 'Your Category',
  name: 'Your Node',
  icon: '🎯',
  description: 'What it does',
  inputs: ['input1'],
  outputs: ['output1'],
  config: {}
});
```

### Add New API Endpoint:
Edit `src/server.js` or `src/auto-clicker-api.js`:
```javascript
app.post('/api/your-endpoint', asyncErrorHandler(async (req, res) => {
  // Your logic
  res.json({ success: true, data: result });
}));
```

### Add New UI Feature:
Edit `public/node-editor.html`:
```javascript
function yourNewFeature() {
  // Your code
  showNotification('Title', 'Message', 'success');
}
```

---

## What NOT To Do

❌ Don't commit to master directly
❌ Don't break existing tests
❌ Don't remove validation functions
❌ Don't add dependencies without discussion
❌ Don't commit node_modules or .env
❌ Don't use console.log in production code
❌ Don't commit commented-out code
❌ Don't duplicate functions (check first!)

---

## Pull Request Process

### 1. Before Creating PR:
```bash
# All tests pass?
npm run test:quick

# TypeScript clean?
npx tsc --noEmit

# Lint clean?
npm run lint

# All changes committed?
git status
```

### 2. Create PR:
- Clear title describing change
- Description of what/why
- Screenshots if UI change
- Link related issues

### 3. PR Checklist:
- [ ] Tests pass locally
- [ ] TypeScript compiles
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tested in browser

---

## Getting Help

### Check These First:
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
2. [HONEST_STATUS.md](HONEST_STATUS.md) - What works
3. [SESSION_3_SUMMARY.md](SESSION_3_SUMMARY.md) - Recent changes
4. Browser console (F12) - Error messages

### Ask Questions:
- GitHub Issues for bugs
- GitHub Discussions for questions
- Be specific about problem
- Include error messages
- Share steps to reproduce

---

## Areas Needing Help

### High Priority:
- [ ] Fix remaining test failures (101 old tests)
- [ ] Test Python agent integration
- [ ] Test Electron app launch
- [ ] Add more workflow templates
- [ ] Improve error messages

### Medium Priority:
- [ ] Add workflow validation
- [ ] Improve UI responsiveness
- [ ] Add keyboard shortcuts
- [ ] Better connection routing
- [ ] Node grouping feature

### Low Priority:
- [ ] Dark/light theme toggle
- [ ] Export workflows to code
- [ ] Workflow versioning
- [ ] Collaborative editing
- [ ] Plugin system

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Thanked in commits

---

## Code of Conduct

- Be respectful
- Be patient with beginners
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn

---

## License

By contributing, you agree your contributions will be licensed under the MIT License.

---

**Questions?** Open an issue or discussion on GitHub!

**Found a bug?** Create an issue with reproduction steps!

**Have an idea?** Start a discussion!

---

**Last Updated:** Session 3
**Current Focus:** Stabilization and testing
**Most Needed:** Test coverage improvements
