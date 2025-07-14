/**
 * UAT Test Helper Utilities
 * Provides common functionality for user acceptance testing
 */

export class TestHelper {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for game initialization to complete
   */
  async waitForGameInitialization() {
    // Wait for loading overlay to disappear
    await this.page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
    
    // Wait for canvas to be created
    await this.page.waitForSelector('canvas', { timeout: 5000 });
    
    // Wait for game state to be ready
    await this.page.waitForFunction(() => {
      return window.game && window.game.isInitialized;
    }, { timeout: 10000 });
  }

  /**
   * Simulate ball hit with power and direction
   */
  async hitBall(power = 0.5, direction = { x: 0, y: 0 }) {
    await this.page.evaluate(({ power, direction }) => {
      if (window.game && window.game.ballManager) {
        window.game.ballManager.hitBall(power, direction);
      }
    }, { power, direction });
  }

  /**
   * Wait for ball to stop moving
   */
  async waitForBallToStop() {
    await this.page.waitForFunction(() => {
      return window.game && 
             window.game.ballManager && 
             window.game.ballManager.ball &&
             window.game.ballManager.ball.body.velocity.lengthSquared() < 0.01;
    }, { timeout: 15000 });
  }

  /**
   * Get current game state
   */
  async getGameState() {
    return await this.page.evaluate(() => {
      return window.game ? window.game.gameState : null;
    });
  }

  /**
   * Get current hole number
   */
  async getCurrentHole() {
    return await this.page.evaluate(() => {
      return window.game && window.game.stateManager ? 
             window.game.stateManager.currentHole : null;
    });
  }

  /**
   * Get current stroke count
   */
  async getStrokeCount() {
    return await this.page.evaluate(() => {
      return window.game && window.game.scoringSystem ? 
             window.game.scoringSystem.getCurrentHoleStrokes() : null;
    });
  }

  /**
   * Get total score
   */
  async getTotalScore() {
    return await this.page.evaluate(() => {
      return window.game && window.game.scoringSystem ? 
             window.game.scoringSystem.getTotalScore() : null;
    });
  }

  /**
   * Simulate touch gesture for mobile testing
   */
  async simulateTouch(x, y, action = 'tap') {
    if (action === 'tap') {
      await this.page.touchscreen.tap(x, y);
    } else if (action === 'swipe') {
      await this.page.touchscreen.tap(x, y);
      await this.page.touchscreen.tap(x + 100, y + 100);
    }
  }

  /**
   * Check for performance issues
   */
  async checkPerformance() {
    const metrics = await this.page.evaluate(() => {
      return {
        fps: window.game?.performanceManager?.currentFPS || 0,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0,
        renderTime: window.game?.performanceManager?.lastRenderTime || 0
      };
    });
    return metrics;
  }

  /**
   * Take screenshot for visual regression testing
   */
  async takeScreenshot(name) {
    return await this.page.screenshot({
      path: `tests/uat/screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Check if game is responsive on mobile
   */
  async checkMobileResponsiveness() {
    const viewport = this.page.viewportSize();
    const canvas = await this.page.locator('canvas').boundingBox();
    
    return {
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      isResponsive: canvas.width <= viewport.width && canvas.height <= viewport.height
    };
  }
}