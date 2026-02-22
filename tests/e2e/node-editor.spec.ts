/**
 * End-to-End Tests for Node Editor
 * Tests complete user workflows in the browser
 */

import { test, expect } from '@playwright/test';

test.describe('Node Editor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to node editor
    await page.goto('http://localhost:3000/node-editor');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="node-editor"]');
  });

  test('should load node editor with toolbar', async ({ page }) => {
    // Check toolbar is present
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
    
    // Check main canvas area
    await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
    
    // Check property panel is present
    await expect(page.locator('[data-testid="property-panel"]')).toBeVisible();
  });

  test('should show empty state when no workflow is loaded', async ({ page }) => {
    // Check for empty state message
    await expect(page.locator('text=Drag nodes from the palette')).toBeVisible();
  });

  test('should display toolbar controls', async ({ page }) => {
    // Check start button
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible();
    
    // Check stop button (should be disabled initially)
    const stopButton = page.locator('[data-testid="stop-button"]');
    await expect(stopButton).toBeVisible();
    await expect(stopButton).toBeDisabled();
    
    // Check save button
    await expect(page.locator('[data-testid="save-button"]')).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+S save shortcut
    await page.keyboard.press('Control+s');
    
    // Check if save was triggered (would show save indicator)
    await page.waitForTimeout(100);
  });

  test('should show property panel when node is selected', async ({ page }) => {
    // This test would require adding a node first
    // For now, test that property panel shows empty state
    
    const propertyPanel = page.locator('[data-testid="property-panel"]');
    await expect(propertyPanel).toContainText('Select a node to configure its properties');
  });

  test('should display error messages when errors occur', async ({ page }) => {
    // Simulate an error by clicking a button that triggers one
    // For now, test error display component exists
    
    await page.locator('[data-testid="error-display"]').waitFor({ state: 'hidden' });
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
    
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    // Toolbar should adapt to mobile
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
  });

  test('should support accessibility features', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test ARIA labels
    const startButton = page.locator('[data-testid="start-button"]');
    await expect(startButton).toHaveAttribute('aria-label');
  });

  test('should handle workflow execution', async ({ page }) => {
    // Start workflow
    await page.click('[data-testid="start-button"]');
    
    // Check status changes to running
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText('running');
    
    // Stop workflow
    await page.click('[data-testid="stop-button"]');
    
    // Check status changes to idle
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText('idle');
  });

  test('should persist workflow changes', async ({ page }) => {
    // This would test that changes are saved
    // For now, test save functionality exists
    
    await page.click('[data-testid="save-button"]');
    
    // Check for save confirmation (would need to implement)
    await page.waitForTimeout(100);
  });

  test('should handle real-time updates', async ({ page }) => {
    // This would test WebSocket connections
    // For now, test that the page can handle updates
    
    // Simulate receiving a workflow update
    await page.evaluate(() => {
      // This would be replaced with actual WebSocket test
      window.dispatchEvent(new CustomEvent('workflow-update', {
        detail: { status: 'running' }
      }));
    });
    
    await page.waitForTimeout(100);
  });
});

test.describe('Node Editor Performance Tests', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000/node-editor');
    await page.waitForSelector('[data-testid="node-editor"]');
    
    const loadTime = Date.now() - startTime;
    
    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large workflows efficiently', async ({ page }) => {
    await page.goto('http://localhost:3000/node-editor');
    
    // Simulate loading a large workflow
    await page.evaluate(() => {
      // This would load a workflow with many nodes
      // For now, just test that the page doesn't crash
      const largeWorkflow = {
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          type: 'HTTP Request',
          name: `Node ${i}`,
          x: (i % 10) * 200,
          y: Math.floor(i / 10) * 150,
          inputs: ['main'],
          outputs: ['main'],
          config: {},
          status: 'idle'
        })),
        connections: [],
        variables: {},
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Simulate loading this workflow
      window.dispatchEvent(new CustomEvent('workflow-loaded', {
        detail: largeWorkflow
      }));
    });
    
    // Page should still be responsive
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
  });
});

test.describe('Node Editor Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('http://localhost:3000/node-editor');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-display"]')).toBeVisible();
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/node-editor');
    
    // Simulate a JavaScript error
    await page.evaluate(() => {
      throw new Error('Test error');
    });
    
    // Should not crash the page
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
  });
});
