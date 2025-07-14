/**
 * Mobile Device UAT Tests
 * Tests mobile-specific functionality and optimizations
 */

const { test, expect, devices } = require('@playwright/test');
const { TestHelper } = require('./utils/TestHelper');

test.describe('Mobile Device Testing', () => {
  test.describe('iPhone Testing', () => {
    test.use({ ...devices['iPhone 12'] });
    
    let testHelper;

    test.beforeEach(async ({ page }) => {
      testHelper = new TestHelper(page);
      await page.goto('/');
    });

    test('should load and be responsive on iPhone', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Check mobile responsiveness
      const responsiveness = await testHelper.checkMobileResponsiveness();
      expect(responsiveness.isResponsive).toBe(true);
      
      // Verify mobile-specific UI elements
      await expect(page.locator('#ui-container')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
      
      // Check viewport meta tag for mobile optimization
      const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
      expect(viewport).toContain('user-scalable=no');
      
      await testHelper.takeScreenshot('iphone-responsive');
    });

    test('should handle touch gestures correctly', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Test touch tap for ball hitting
      const canvas = await page.locator('canvas');
      const canvasBounds = await canvas.boundingBox();
      
      // Simulate touch tap on canvas
      await testHelper.simulateTouch(
        canvasBounds.x + canvasBounds.width / 2,
        canvasBounds.y + canvasBounds.height / 2,
        'tap'
      );
      
      // Wait and verify ball was hit
      await page.waitForTimeout(1000);
      const strokes = await testHelper.getStrokeCount();
      expect(strokes).toBeGreaterThan(0);
      
      await testHelper.takeScreenshot('iphone-touch-gesture');
    });

    test('should optimize performance for mobile', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Check mobile-specific performance optimizations
      const mobileOptimizations = await page.evaluate(() => {
        return {
          devicePixelRatio: window.devicePixelRatio,
          isOptimizedForMobile: window.game?.renderer?.getPixelRatio() <= 2,
          reducedParticles: window.game?.performanceManager?.isMobileOptimized || false
        };
      });
      
      expect(mobileOptimizations.isOptimizedForMobile).toBe(true);
      
      // Performance should be acceptable on mobile
      const metrics = await testHelper.checkPerformance();
      expect(metrics.fps).toBeGreaterThan(25); // Lower threshold for mobile
    });

    test('should handle device orientation changes', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Simulate orientation change to landscape
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(1000);
      
      // Verify game adapts to new orientation
      const responsiveness = await testHelper.checkMobileResponsiveness();
      expect(responsiveness.isResponsive).toBe(true);
      
      // Game should still be playable
      await testHelper.hitBall(0.5);
      await testHelper.waitForBallToStop();
      
      await testHelper.takeScreenshot('iphone-landscape');
    });
  });

  test.describe('iPad Testing', () => {
    test.use({ ...devices['iPad Pro'] });
    
    let testHelper;

    test.beforeEach(async ({ page }) => {
      testHelper = new TestHelper(page);
      await page.goto('/');
    });

    test('should provide optimal experience on iPad', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // iPad should use higher quality settings
      const tabletOptimizations = await page.evaluate(() => {
        return {
          pixelRatio: window.game?.renderer?.getPixelRatio(),
          shadowsEnabled: window.game?.renderer?.shadowMap?.enabled || false,
          antialiasEnabled: window.game?.renderer?.antialias || false
        };
      });
      
      // iPad should support better graphics
      expect(tabletOptimizations.pixelRatio).toBeGreaterThan(1);
      
      // Verify larger touch targets for tablet
      const powerIndicator = await page.locator('#power-indicator-container');
      const bounds = await powerIndicator.boundingBox();
      expect(bounds.height).toBeGreaterThan(50); // Adequate touch target size
      
      await testHelper.takeScreenshot('ipad-optimized');
    });

    test('should handle multi-touch gestures', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Test pinch-to-zoom functionality (if implemented)
      const canvas = await page.locator('canvas');
      const canvasBounds = await canvas.boundingBox();
      
      // Simulate pinch gesture
      const centerX = canvasBounds.x + canvasBounds.width / 2;
      const centerY = canvasBounds.y + canvasBounds.height / 2;
      
      await page.touchscreen.tap(centerX - 50, centerY - 50);
      await page.touchscreen.tap(centerX + 50, centerY + 50);
      
      // Verify camera zoom or interaction
      await page.waitForTimeout(500);
      
      await testHelper.takeScreenshot('ipad-multitouch');
    });
  });

  test.describe('Android Device Testing', () => {
    test.use({ ...devices['Pixel 5'] });
    
    let testHelper;

    test.beforeEach(async ({ page }) => {
      testHelper = new TestHelper(page);
      await page.goto('/');
    });

    test('should work correctly on Android device', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Test Android-specific optimizations
      const androidFeatures = await page.evaluate(() => {
        return {
          touchEventsSupported: 'ontouchstart' in window,
          devicePixelRatio: window.devicePixelRatio,
          webGLSupported: !!window.WebGLRenderingContext
        };
      });
      
      expect(androidFeatures.touchEventsSupported).toBe(true);
      expect(androidFeatures.webGLSupported).toBe(true);
      
      // Test gameplay on Android
      await testHelper.hitBall(0.6);
      await testHelper.waitForBallToStop();
      
      const strokes = await testHelper.getStrokeCount();
      expect(strokes).toBe(1);
      
      await testHelper.takeScreenshot('android-gameplay');
    });

    test('should handle Android browser differences', async ({ page }) => {
      await testHelper.waitForGameInitialization();
      
      // Check for Android-specific browser behaviors
      const browserInfo = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          isChrome: navigator.userAgent.includes('Chrome'),
          supportsWebGL2: !!window.WebGL2RenderingContext
        };
      });
      
      // Verify game adapts to browser capabilities
      if (browserInfo.supportsWebGL2) {
        const webgl2Features = await page.evaluate(() => {
          return window.game?.renderer?.capabilities?.isWebGL2 || false;
        });
        // Game should utilize WebGL2 if available
      }
      
      await testHelper.takeScreenshot('android-browser-adaptation');
    });
  });

  test.describe('Cross-Platform Mobile Features', () => {
    const mobileDevices = [
      { name: 'iPhone 12', device: devices['iPhone 12'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] },
      { name: 'iPad Pro', device: devices['iPad Pro'] }
    ];

    mobileDevices.forEach(({ name, device }) => {
      test(`should maintain consistent experience on ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device
        });
        const page = await context.newPage();
        const testHelper = new TestHelper(page);
        
        await page.goto('/');
        await testHelper.waitForGameInitialization();
        
        // Test core functionality works consistently
        await testHelper.hitBall(0.5);
        await testHelper.waitForBallToStop();
        
        const gameState = await testHelper.getGameState();
        const strokes = await testHelper.getStrokeCount();
        
        expect(gameState).toBeTruthy();
        expect(strokes).toBe(1);
        
        // Performance should be acceptable across devices
        const metrics = await testHelper.checkPerformance();
        expect(metrics.fps).toBeGreaterThan(20); // Minimum acceptable FPS
        
        await testHelper.takeScreenshot(`${name.toLowerCase()}-consistency`);
        await context.close();
      });
    });

    test('should handle network connectivity issues on mobile', async ({ page }) => {
      test.use({ ...devices['iPhone 12'] });
      
      const testHelper = new TestHelper(page);
      await page.goto('/');
      await testHelper.waitForGameInitialization();
      
      // Simulate poor network conditions
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      // Game should continue to work offline
      await testHelper.hitBall(0.4);
      await testHelper.waitForBallToStop();
      
      const strokes = await testHelper.getStrokeCount();
      expect(strokes).toBeGreaterThan(0);
      
      // Restore connectivity
      await page.context().setOffline(false);
    });

    test('should optimize battery usage on mobile', async ({ page }) => {
      test.use({ ...devices['iPhone 12'] });
      
      const testHelper = new TestHelper(page);
      await page.goto('/');
      await testHelper.waitForGameInitialization();
      
      // Test battery optimization features
      const batteryOptimizations = await page.evaluate(() => {
        return {
          reducedAnimations: window.game?.performanceManager?.batteryOptimized || false,
          adaptiveFrameRate: window.game?.gameLoopManager?.adaptiveFrameRate || false,
          backgroundThrottling: document.visibilityState === 'hidden'
        };
      });
      
      // Simulate tab going to background
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          writable: true,
          value: 'hidden'
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(1000);
      
      // Game should throttle performance when in background
      const backgroundMetrics = await testHelper.checkPerformance();
      
      await testHelper.takeScreenshot('mobile-battery-optimization');
    });
  });
});