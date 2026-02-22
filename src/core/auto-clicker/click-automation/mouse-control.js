/**
 * Mouse Control Module - JavaScript Version
 * Robust mouse movement and clicking with multiple methods
 */

const { exec } = require('child_process');

class MouseControl {
  constructor() {
    this.currentX = 0;
    this.currentY = 0;
  }

  async move(x, y) {
    return new Promise((resolve, reject) => {
      console.log(`🖱️ Moving mouse to (${x}, ${y})`);

      const psCommand = `
        Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            public class Mouse {
                [DllImport("user32.dll")]
                public static extern bool SetCursorPos(int x, int y);
                [DllImport("user32.dll")]
                public static extern bool GetCursorPos(out POINT lpPoint);
                
                [StructLayout(LayoutKind.Sequential)]
                public struct POINT {
                    public int X;
                    public int Y;
                }
                
                public static POINT GetPosition() {
                    POINT p;
                    GetCursorPos(out p);
                    return p;
                }
            }
        ';
        
        # Move mouse to position
        [Mouse]::SetCursorPos(${x}, ${y});
        
        # Verify position
        $pos = [Mouse]::GetPosition();
        Write-Output "MOVED:$($pos.X),$($pos.Y)";
      `;

      exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Mouse move failed:', error);
          reject(error);
          return;
        }

        const output = stdout.trim();
        if (output.startsWith('MOVED:')) {
          const [actualX, actualY] = output.substring(6).split(',').map(Number);
          this.currentX = actualX || 0;
          this.currentY = actualY || 0;
          console.log(`✅ Mouse moved to (${actualX}, ${actualY})`);
          resolve();
        } else {
          reject(new Error('Unexpected mouse move response'));
        }
      });
    });
  }

  async click(config) {
    const timestamp = Date.now();
    const coordinates = config.coordinates || { x: this.currentX, y: this.currentY };

    try {
      console.log(`🖱️ Clicking ${config.button} button at (${coordinates.x}, ${coordinates.y})`);

      // Move to position if specified
      if (config.coordinates) {
        await this.move(config.coordinates.x, config.coordinates.y);
      }

      // Perform the click based on type
      switch (config.clickType) {
        case 'single':
          await this.performSingleClick(config.button, coordinates);
          break;
        case 'double':
          await this.performDoubleClick(config.button, coordinates);
          break;
        case 'hold':
          await this.performHoldClick(config.button, coordinates, config.duration || 1000);
          break;
        default:
          throw new Error(`Unknown click type: ${config.clickType}`);
      }

      return {
        success: true,
        coordinates,
        timestamp,
        button: config.button
      };

    } catch (error) {
      console.error('❌ Click failed:', error);
      return {
        success: false,
        coordinates,
        timestamp,
        button: config.button,
        error: error.message || 'Unknown click error'
      };
    }
  }

  async performSingleClick(button, coordinates) {
    return new Promise((resolve, reject) => {
      const buttonFlags = {
        left: { down: 0x02, up: 0x04 },
        right: { down: 0x08, up: 0x10 },
        middle: { down: 0x20, up: 0x40 }
      };

      const flags = buttonFlags[button];
      if (!flags) {
        reject(new Error(`Unknown button: ${button}`));
        return;
      }

      const psCommand = `
        Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            public class Mouse {
                [DllImport("user32.dll")]
                public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
            }
        ';
        
        # Move to position and click
        [Mouse]::mouse_event(${flags.down}, 0, 0, 0, 0);
        Start-Sleep -Milliseconds 50;
        [Mouse]::mouse_event(${flags.up}, 0, 0, 0, 0);
        
        Write-Output "CLICKED";
      `;

      exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        if (stdout.trim() === 'CLICKED') {
          console.log(`✅ Single ${button} click performed`);
          resolve();
        } else {
          reject(new Error('Click command failed'));
        }
      });
    });
  }

  async performDoubleClick(button, coordinates) {
    console.log(`🖱️ Performing double ${button} click`);
    
    // Double click is just two single clicks in quick succession
    await this.performSingleClick(button, coordinates);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between clicks
    await this.performSingleClick(button, coordinates);
  }

  async performHoldClick(button, coordinates, duration) {
    return new Promise((resolve, reject) => {
      const buttonFlags = {
        left: { down: 0x02, up: 0x04 },
        right: { down: 0x08, up: 0x10 },
        middle: { down: 0x20, up: 0x40 }
      };

      const flags = buttonFlags[button];
      if (!flags) {
        reject(new Error(`Unknown button: ${button}`));
        return;
      }

      const psCommand = `
        Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            public class Mouse {
                [DllImport("user32.dll")]
                public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
            }
        ';
        
        # Hold mouse button down
        [Mouse]::mouse_event(${flags.down}, 0, 0, 0, 0);
        Start-Sleep -Milliseconds ${duration};
        [Mouse]::mouse_event(${flags.up}, 0, 0, 0, 0);
        
        Write-Output "HELD_CLICKED";
      `;

      exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        if (stdout.trim() === 'HELD_CLICKED') {
          console.log(`✅ Hold ${button} click performed for ${duration}ms`);
          resolve();
        } else {
          reject(new Error('Hold click command failed'));
        }
      });
    });
  }

  async getPosition() {
    return new Promise((resolve, reject) => {
      const psCommand = `
        Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            public class Mouse {
                [DllImport("user32.dll")]
                public static extern bool GetCursorPos(out POINT lpPoint);
                
                [StructLayout(LayoutKind.Sequential)]
                public struct POINT {
                    public int X;
                    public int Y;
                }
            }
        ';
        
        $pos = [Mouse]::GetPosition();
        Write-Output "$($pos.X),$($pos.Y)";
      `;

      exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const [x, y] = stdout.trim().split(',').map(Number);
        this.currentX = x || 0;
        this.currentY = y || 0;
        resolve({ x, y });
      });
    });
  }

  setCursor(cursor) {
    console.log(`🖱️ Setting cursor to: ${cursor}`);
    // In a full implementation, this would change the system cursor
    // For now, just log the action
  }

  // Utility method to test mouse control
  async testClick() {
    try {
      console.log('🧪 Testing mouse control...');
      
      // Get current position
      const pos = await this.getPosition();
      console.log(`📍 Current position: (${pos.x}, ${pos.y})`);
      
      // Move to a test position
      await this.move(100, 100);
      
      // Perform a test click
      const result = await this.click({
        button: 'left',
        clickType: 'single',
        coordinates: { x: 100, y: 100 }
      });
      
      console.log('✅ Mouse control test passed');
      return result.success;
      
    } catch (error) {
      console.error('❌ Mouse control test failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
module.exports = { MouseControl };
