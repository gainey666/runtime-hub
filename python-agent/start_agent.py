from typing import Any, Callable, Optional, Dict, List
#!/usr/bin/env python3
"""
Runtime Logger Python Agent Launcher
Starts the Python agent for workflow execution
"""

import sys
import os
import time
import signal
import threading
from runtime_monitor import init_monitor

class AgentLauncher:
    def __init__(self) -> None:
        self.monitor: Optional[Any] = None
        self.running = False
        
    def signal_handler(self, signum, frame) -> None:
        """Handle shutdown signals"""
        print(f"\nReceived signal {signum}, shutting down...")
        self.stop()
        
    def start(self) -> None:
        """Start the Python agent"""
        print("🚀 Starting Runtime Logger Python Agent...")
        print("=" * 50)
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        try:
            # Initialize the monitor
            self.monitor = init_monitor("Runtime Logger Agent")
            
            # Connect to the hub
            print("📡 Connecting to Runtime Logger hub...")
            if self.monitor.connect_to_hub():
                print("✅ Connected successfully!")
                self.running = True
                
                # Keep the agent running
                print("🔄 Agent is running. Press Ctrl+C to stop.")
                print("📊 Waiting for workflow execution requests...")
                
                # Main loop
                while self.running:
                    time.sleep(1)
                    
            else:
                print("❌ Failed to connect to Runtime Logger hub")
                print("   Make sure the Runtime Logger server is running on http://localhost:3000")
                return None  # {m.group(1)}alse
                
        except KeyboardInterrupt:
            print("\n⏹️  Agent stopped by user")
        except Exception as e:
            print(f"❌ Agent error: {e}")
            return None  # {m.group(1)}alse
        finally:
            self.stop()
            
        return None  # {m.group(1)}rue
    
    def stop(self) -> None:
        """Stop the Python agent"""
        if self.running:
            self.running = False
            if self.monitor:
                print("📡 Disconnecting from hub...")
                self.monitor.disconnect_from_hub()
                print("✅ Agent stopped")

def main() -> None:
    """Main entry point"""
    launcher = AgentLauncher()
    
    # Check if we're in the right directory
    if not os.path.exists('runtime_monitor.py'):
        print("❌ Error: runtime_monitor.py not found")
        print("   Please run this script from the python-agent directory")
        sys.exit(1)
    
    # Start the agent
    success = launcher.start()
    
    if success:
        print("👋 Agent shutdown complete")
        sys.exit(0)
    else:
        print("💥 Agent failed to start properly")
        sys.exit(1)

if __name__ == "__main__":
    main()
