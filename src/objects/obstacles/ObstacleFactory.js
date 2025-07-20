import { obstacleRegistry } from './ObstacleRegistry';

/**
 * Factory for creating obstacles and integrating with the game
 */
export class ObstacleFactory {
  constructor(game) {
    this.game = game;
    this.obstacles = new Map();
  }

  /**
   * Create obstacles from course configuration
   */
  createObstacles(obstacleConfigs = []) {
    const obstacles = [];

    for (const config of obstacleConfigs) {
      try {
        const obstacle = this.createObstacle(config.type, config);
        if (obstacle) {
          obstacles.push(obstacle);
        }
      } catch (error) {
        console.error(`Failed to create obstacle: ${error.message}`, config);
      }
    }

    return obstacles;
  }

  /**
   * Create a single obstacle
   */
  createObstacle(type, config = {}) {
    try {
      // Merge type into config
      const fullConfig = { ...config, type };

      if (!fullConfig.type) {
        console.warn('Invalid obstacle config:', fullConfig);
        return null;
      }

      // Create obstacle instance
      const obstacle = obstacleRegistry.create(fullConfig);

      if (!obstacle) {
        console.error('Registry failed to create obstacle of type:', type);
        return null;
      }

      // Initialize with game reference
      if (obstacle.init) {
        obstacle.init(this.game);
      }

      // Add to scene
      if (obstacle.getGroup && obstacle.getGroup()) {
        this.game.scene.add(obstacle.getGroup());
      }

      // Track obstacle
      this.obstacles.set(obstacle.id, obstacle);

      return obstacle;
    } catch (error) {
      console.error('Failed to create obstacle:', error);
      return null;
    }
  }

  /**
   * Get obstacle by ID
   */
  getObstacle(id) {
    return this.obstacles.get(id);
  }

  /**
   * Remove obstacle by ID
   */
  removeObstacle(id) {
    const obstacle = this.obstacles.get(id);
    if (obstacle) {
      // Remove from scene
      if (obstacle.getGroup() && this.game.scene) {
        this.game.scene.remove(obstacle.getGroup());
      }

      // Dispose
      obstacle.dispose();

      // Remove from tracking
      this.obstacles.delete(id);
    }
  }

  /**
   * Update all obstacles
   */
  update(deltaTime) {
    for (const obstacle of this.obstacles.values()) {
      if (obstacle.update) {
        obstacle.update(deltaTime);
      }
    }
  }

  /**
   * Dispose all obstacles
   */
  disposeAll() {
    for (const obstacle of this.obstacles.values()) {
      // Remove from scene
      if (obstacle.getGroup() && this.game.scene) {
        this.game.scene.remove(obstacle.getGroup());
      }

      // Dispose
      obstacle.dispose();
    }
    this.obstacles.clear();
  }

  /**
   * Get all obstacles
   */
  getObstacles() {
    return this.obstacles;
  }

  /**
   * Get obstacles by type
   */
  getObstaclesByType(type) {
    return Array.from(this.obstacles.values()).filter(obstacle => obstacle.type === type);
  }

  /**
   * Clear all obstacles
   */
  clearObstacles() {
    for (const obstacle of this.obstacles.values()) {
      // Remove from scene
      if (obstacle.getGroup() && this.game.scene) {
        this.game.scene.remove(obstacle.getGroup());
      }

      // Dispose
      obstacle.dispose();
    }

    this.obstacles.clear();
  }

  /**
   * Dispose of the factory
   */
  dispose() {
    this.clearObstacles();
  }
}
