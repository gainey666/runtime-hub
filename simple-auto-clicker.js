/**
 * Simple Auto-Clicker API
 * Just basic clicking functionality that works
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const port = 3003; // Different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Simple click function
function performClick(x, y, button = 'left') {
    return new Promise((resolve, reject) => {
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
                    public const uint MOUSEEVENTF_RIGHTDOWN = 0x08;
                    public const uint MOUSEEVENTF_RIGHTUP = 0x10;
                }
            ';
            
            # Move mouse to position
            [Mouse]::SetCursorPos(${x}, ${y});
            Start-Sleep -Milliseconds 100;
            
            # Click
            $button = "${button}";
            if ($button -eq "left") {
                [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                Start-Sleep -Milliseconds 50;
                [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
            } elseif ($button -eq "right") {
                [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
                Start-Sleep -Milliseconds 50;
                [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
            }
            
            Write-Output "Clicked at (${x}, ${y}) with ${button} button";
        `;
        
        exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// API Routes
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Simple Auto-Clicker API' });
});

app.post('/api/click', async (req, res) => {
    try {
        const { x, y, button = 'left' } = req.body;
        
        if (typeof x !== 'number' || typeof y !== 'number') {
            return res.status(400).json({ error: 'x and y must be numbers' });
        }
        
        console.log(`🖱️ Clicking at (${x}, ${y}) with ${button} button`);
        
        const result = await performClick(x, y, button);
        
        res.json({
            success: true,
            message: result,
            coordinates: { x, y },
            button: button
        });
        
    } catch (error) {
        console.error('❌ Click failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/multiple-clicks', async (req, res) => {
    try {
        const { clicks, interval = 1000 } = req.body;
        
        if (!Array.isArray(clicks)) {
            return res.status(400).json({ error: 'clicks must be an array' });
        }
        
        console.log(`🖱️ Performing ${clicks.length} clicks`);
        
        const results = [];
        for (let i = 0; i < clicks.length; i++) {
            const { x, y, button = 'left' } = clicks[i];
            const result = await performClick(x, y, button);
            results.push(result);
            
            if (i < clicks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        
        res.json({
            success: true,
            message: `Performed ${clicks.length} clicks`,
            results: results
        });
        
    } catch (error) {
        console.error('❌ Multiple clicks failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🖱️ Simple Auto-Clicker API running on http://localhost:${port}`);
    console.log(`📊 Health: http://localhost:${port}/health`);
    console.log(`🎯 Click API: POST http://localhost:${port}/api/click`);
    console.log(`🔄 Multiple Clicks: POST http://localhost:${port}/api/multiple-clicks`);
});

module.exports = app;
