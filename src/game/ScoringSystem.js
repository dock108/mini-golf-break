/**
 * ScoringSystem - Manages score for the mini-golf game
 */
export class ScoringSystem {
  constructor(game) {
    this.game = game;
    this.continuousStrokeCount = 0; // Total strokes across all holes
    this.currentHoleStrokes = 0; // Strokes for the current hole
  }

  /**
   * Add a stroke to the continuous counter and current hole counter
   */
  addStroke() {
    this.continuousStrokeCount++;
    this.currentHoleStrokes++;
    console.log(
      `[ScoringSystem] Stroke Added. Current Hole: ${this.currentHoleStrokes}, Total: ${this.continuousStrokeCount}`
    );
    return this;
  }

  /**
   * Get total strokes across all holes
   */
  getTotalStrokes() {
    return this.continuousStrokeCount;
  }

  /**
   * Get current strokes for the current hole
   */
  getCurrentStrokes() {
    return this.currentHoleStrokes;
  }

  /**
   * Resets the stroke count for the current hole.
   */
  resetCurrentStrokes() {
    console.log(
      `[ScoringSystem] Resetting current hole strokes from ${this.currentHoleStrokes} to 0.`
    );
    this.currentHoleStrokes = 0;
    return this;
  }

  /**
   * Complete the current hole (placeholder - might be used later for per-hole score saving)
   */
  completeHole() {
    // Currently does nothing extra, reset handled by resetCurrentStrokes via StateManager
    return this;
  }
}
