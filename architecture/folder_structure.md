# Auto-Clicker Restoration Architecture

## Current Critical Issues
- TypeScript/JavaScript module system incompatibility (.ts vs .js)
- Missing module.exports in several auto-clicker modules
- Import path conflicts - API server can't locate auto-clicker-engine
- Mixed module systems (TypeScript exports with CommonJS imports)
- 432 UI/React compilation errors (JSX, implicit any types)
- Cross-project communication broken (windsurf-project-13 ↔ auto-clicker-tool)

## Proposed Auto-Clicker Restoration Structure

```
src/
├── core/                        # Core Business Logic (FIXED)
│   └── auto-clicker/           # Auto-clicker modules (CONVERTED TO .js)
│       ├── auto-clicker-engine.js    # Main orchestrator (CommonJS)
│       ├── screen-capture/          # Screen capture modules
│       │   ├── windows-capture.js   # PowerShell/Python fallbacks
│       │   └── ocr-engine.js         # OCR processing
│       └── click-automation/         # Mouse control
│           └── mouse-control.js      # PowerShell mouse events
├── ui/                          # UI Layer (NEW)
│   ├── components/              # Reusable UI components
│   │   ├── NodeEditor/          # Node editor specific components
│   │   │   ├── Node.tsx         # Individual node component
│   │   │   ├── NodePort.tsx     # Connection ports
│   │   │   ├── Connection.tsx   # Connection lines
│   │   │   ├── Canvas.tsx       # Main canvas
│   │   │   └── PropertyPanel.tsx # Node configuration
│   │   ├── Workflow/            # Workflow management
│   │   │   ├── Toolbar.tsx      # Execution controls
│   │   │   ├── StatusPanel.tsx  # Status dashboard
│   │   │   └── ErrorDisplay.tsx # Error visualization
│   │   ├── Common/              # Shared components
│   │   │   ├── Button.tsx       # Standardized buttons
│   │   │   ├── Modal.tsx        # Dialog components
│   │   │   ├── Tooltip.tsx      # Help tooltips
│   │   │   └── Loading.tsx      # Loading states
│   │   └── Layout/              # Layout components
│   │       ├── Sidebar.tsx      # Navigation sidebar
│   │       ├── Header.tsx       # Top navigation
│   │       └── Footer.tsx       # Bottom info
│   ├── hooks/                   # Custom React hooks
│   │   ├── useWorkflow.ts       # Workflow state management
│   │   ├── useNodeEditor.ts     # Canvas interactions
│   │   ├── useKeyboard.ts       # Keyboard shortcuts
│   │   └── useWebSocket.ts      # Real-time updates
│   ├── stores/                  # State management
│   │   ├── workflowStore.ts      # Workflow state
│   │   ├── nodeEditorStore.ts   # Canvas state
│   │   └── uiStore.ts           # UI state
│   ├── services/                # API and business logic
│   │   ├── workflowService.ts    # Workflow API calls
│   │   ├── nodeService.ts        # Node operations
│   │   ├── autoClickerService.ts # Auto-clicker integration
│   │   ├── screenCaptureService.ts # Screen capture functionality
│   │   ├── ocrService.ts         # OCR text recognition
│   │   └── loggingService.ts    # Real-time logging system
│   ├── types/                   # TypeScript definitions
│   │   ├── workflow.ts           # Workflow types
│   │   ├── node.ts               # Node types
│   │   └── ui.ts                 # UI types
│   ├── utils/                   # Utility functions
│   │   ├── canvas.ts             # Canvas calculations
│   │   ├── validation.ts         # Form validation
│   │   └── accessibility.ts      # ARIA helpers
│   └── styles/                  # Styling system
│       ├── tokens.ts             # Design tokens
│       ├── themes/               # Theme definitions
│       └── components/           # Component-specific styles
├── core/                        # Business logic
│   ├── workflow-engine/         # Workflow execution engine
│   ├── auto-clicker/            # Auto-clicker core functionality
│   │   ├── screen-capture/      # Screen capture modules
│   │   │   ├── windows-capture.ts # Windows-specific capture
│   │   │   ├── ocr-engine.ts      # OCR processing
│   │   │   └── image-processor.ts # Image manipulation
│   │   ├── click-automation/     # Click automation
│   │   │   ├── mouse-control.ts  # Mouse movement/clicking
│   │   │   └── coordinate-system.ts # Coordinate handling
│   │   └── detection/           # Element detection
│   │       ├── pattern-matcher.ts # Pattern matching
│   │       └── text-locator.ts   # Text location
│   └── logging/                 # Logging system
│       ├── log-capture.ts       # Log collection
│       └── log-broadcaster.ts   # Real-time broadcasting
└── server/                      # Backend
    ├── api/                      # API endpoints
    │   ├── auto-clicker-api.ts   # Auto-clicker REST API
    │   ├── workflow-api.ts       # Workflow management API
    │   └── logging-api.ts        # Log streaming API
    └── socket/                   # WebSocket handlers
        ├── workflow-events.ts    # Workflow event broadcasting
        └── log-events.ts         # Real-time log streaming

public/
├── assets/                      # Static assets
│   ├── icons/                   # Icon library
│   ├── images/                  # Images and illustrations
│   └── fonts/                   # Custom fonts
├── node-editor.html             # Entry point (refactored)
└── auto-clicker.html            # Auto-clicker UI (unchanged)
```

## Benefits
1. **Separation of Concerns** - Clear boundaries between UI and business logic
2. **Component Reusability** - Shared components across different UIs
3. **Type Safety** - Full TypeScript coverage
4. **Maintainability** - Easier to find and modify specific features
5. **Testing** - Isolated components for unit testing
6. **Performance** - Better code splitting and lazy loading
