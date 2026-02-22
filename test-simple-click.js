/**
 * Simple Click Test - Just test basic mouse clicking
 */

const { exec } = require('child_process');

function testClick() {
    console.log('🖱️ Testing simple mouse click...');
    
    // Use PowerShell to click at coordinates
    const psCommand = `
        Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            public class Mouse {
                [DllImport("user32.dll")]
                public static extern void SetCursorPos(int x, int y);
                [DllImport("user32.dll")]
                public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
                public const uint MOUSEEVENTF_LEFTDOWN = 0x02;
                public const uint MOUSEEVENTF_LEFTUP = 0x04;
            }
        ';
        
        # Move mouse to position
        [Mouse]::SetCursorPos(500, 500);
        Start-Sleep -Milliseconds 100;
        
        # Click
        [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Start-Sleep -Milliseconds 50;
        [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        
        Write-Host "✅ Click executed at (500, 500)";
    `;
    
    exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Click failed:', error);
            return;
        }
        console.log('✅ Click successful!');
        console.log('Output:', stdout);
    });
}

testClick();
