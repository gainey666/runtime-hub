import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// Design tokens
const colors = {
  primary: { 600: '#3b82f6' },
  neutral: { 50: '#f9fafb', 800: '#1f2937' },
  autoClicker: {
    success: '#10b981',
    error: '#ef4444',
    idle: '#6b7280',
    running: '#3b82f6',
    paused: '#f59e0b',
    stopped: '#ef4444'
  }
};

// Auto-clicker monitoring component
const AutoClickerMonitor: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'running' | 'paused' | 'stopped'>('idle');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to main server for real-time events
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to auto-clicker monitor');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('auto_clicker_event', (event) => {
      setEvents(prev => [...prev.slice(-99), event]); // Keep last 100 events
    });

    newSocket.on('session_status_update', (status) => {
      setSessionStatus(status.status);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const startSession = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auto-clicker/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: { x: 0, y: 0, width: 800, height: 600 },
          ocr: { engine: 'simple', language: ['eng'], confidence: 0.7 },
          click: { button: 'left', clickType: 'single' },
          refreshRate: 500,
          targetPattern: 'number'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSessionStatus('running');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const stopSession = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auto-clicker/stop', {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        setSessionStatus('stopped');
      }
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: colors.autoClicker[sessionStatus] || '#gray',
        color: 'white',
        borderRadius: '8px'
      }}>
        <h2>Auto-Clicker Monitor</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            backgroundColor: isConnected ? colors.autoClicker.success : colors.autoClicker.error 
          }} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={startSession}
          disabled={sessionStatus === 'running'}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: colors.autoClicker.success,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sessionStatus === 'running' ? 'not-allowed' : 'pointer'
          }}
        >
          Start Session
        </button>
        <button 
          onClick={stopSession}
          disabled={sessionStatus !== 'running'}
          style={{ 
            padding: '8px 16px',
            backgroundColor: colors.autoClicker.error,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sessionStatus !== 'running' ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Session
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '10px',
        height: '300px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>Real-time Events</h3>
        {events.length === 0 ? (
          <p style={{ color: '#666' }}>No events yet...</p>
        ) : (
          events.map((event, index) => (
            <div key={index} style={{ 
              marginBottom: '5px', 
              padding: '5px',
              backgroundColor: 'white',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <strong>{event.type}</strong>: {JSON.stringify(event.data)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.neutral[50] }}>
      <header style={{ 
        backgroundColor: colors.primary[600], 
        color: 'white', 
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>Auto-Clicker Control Center</h1>
      </header>
      
      <main style={{ padding: '20px' }}>
        <AutoClickerMonitor />
      </main>
      
      <footer style={{ 
        backgroundColor: colors.neutral[800], 
        color: 'white', 
        padding: '20px',
        textAlign: 'center'
      }}>
        <p>Real-time Auto-Clicker Monitoring System</p>
      </footer>
    </div>
  );
};

export default App;
