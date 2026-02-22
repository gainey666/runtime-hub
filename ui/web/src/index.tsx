import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Fix React 18 createRoot pattern
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);
root.render(<App />);
