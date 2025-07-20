/**
 * Registry for obstacle types
 * Manages registration and creation of obstacle instances
 */
export class ObstacleRegistry {
  constructor() {
    this.types = new Map();
    this.instances = new Map();
  }

  /**
   * Register a new obstacle type
   */
  register(type, ObstacleClass) {
    if (!type || !ObstacleClass) {
      throw new Error('Type and class are required for registration');
    }

    if (this.types.has(type)) {
      console.warn(`Obstacle type '${type}' is already registered. Overwriting...`);
    }

    this.types.set(type, ObstacleClass);

    return this;
  }

  /**
   * Create an obstacle instance
   */
  create(config) {
    if (!config || !config.type) {
      throw new Error('Config with type is required to create obstacle');
    }

    const ObstacleClass = this.types.get(config.type);
    if (!ObstacleClass) {
      throw new Error(`Unknown obstacle type: ${config.type}`);
    }

    const obstacle = new ObstacleClass(config);

    // Track instance
    this.instances.set(obstacle.id, obstacle);

    return obstacle;
  }

  /**
   * Get an obstacle instance by ID
   */
  getInstance(id) {
    return this.instances.get(id);
  }

  /**
   * Get all instances of a specific type
   */
  getInstancesByType(type) {
    const instances = [];
    for (const [id, obstacle] of this.instances) {
      if (obstacle.type === type) {
        instances.push(obstacle);
      }
    }
    return instances;
  }

  /**
   * Get all obstacle instances
   */
  getAllInstances() {
    return Array.from(this.instances.values());
  }

  /**
   * Remove an obstacle instance
   */
  removeInstance(id) {
    const obstacle = this.instances.get(id);
    if (obstacle) {
      obstacle.dispose();
      this.instances.delete(id);
    }
  }

  /**
   * Remove all instances
   */
  clearInstances() {
    for (const obstacle of this.instances.values()) {
      obstacle.dispose();
    }
    this.instances.clear();
  }

  /**
   * Get registered types
   */
  getTypes() {
    return Array.from(this.types.keys());
  }

  /**
   * Check if a type is registered
   */
  hasType(type) {
    return this.types.has(type);
  }

  /**
   * Check if a type is registered (alias for hasType)
   */
  has(type) {
    return this.types.has(type);
  }

  /**
   * Create multiple obstacles from an array of configs
   */
  createMultiple(configs) {
    const obstacles = [];
    for (const config of configs) {
      try {
        const obstacle = this.create(config);
        obstacles.push(obstacle);
      } catch (error) {
        console.error(`Failed to create obstacle: ${error.message}`, config);
      }
    }
    return obstacles;
  }

  /**
   * Get singleton instance (for compatibility with singleton pattern)
   */
  static getInstance() {
    if (!ObstacleRegistry._instance) {
      ObstacleRegistry._instance = new ObstacleRegistry();
    }
    return ObstacleRegistry._instance;
  }
}

// Singleton instance
export const obstacleRegistry = new ObstacleRegistry();
