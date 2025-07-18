import * as THREE from 'three';
import { HoleEntity } from './HoleEntity';
import { debug } from '../utils/debug';

/**
 * CourseFactory - Creates course objects from JSON data
 * Handles the conversion from JSON course data to actual game objects
 */
export class CourseFactory {
  constructor(game) {
    this.game = game;
  }

  /**
   * Create a course from JSON data
   * @param {Object} courseData - Processed course data from CourseDataManager
   * @returns {Object} Course object compatible with existing game logic
   */
  async createCourse(courseData) {
    try {
      debug.log(`[CourseFactory] Creating course: ${courseData.name}`);

      // Create course object with expected properties
      const course = {
        // Basic properties
        id: courseData.id,
        name: courseData.name,
        author: courseData.author,
        description: courseData.description,
        metadata: courseData.metadata,

        // Course structure
        totalHoles: courseData.totalHoles,
        totalPar: courseData.totalPar,

        // Hole management
        currentHoleIndex: 0,
        holeEntities: [],

        // Methods expected by the game
        getHoleStartPosition: () => this.getHoleStartPosition(course),
        getHolePosition: () => this.getHolePosition(course),
        getCurrentHole: () => this.getCurrentHole(course),
        setCurrentHole: index => this.setCurrentHole(course, index),

        // Raw data access
        rawData: courseData,
        holes: courseData.holes
      };

      // Create HoleEntity objects for each hole
      const holeElements = courseData.elementsByType.hole || [];

      for (const holeData of holeElements) {
        const holeEntity = await this.createHoleEntity(holeData, courseData);
        course.holeEntities.push(holeEntity);
      }

      // Set the current hole entity
      course.currentHoleEntity = course.holeEntities[0] || null;

      // Apply environment settings from course metadata
      if (courseData.metadata?.environment) {
        await this.applyEnvironmentSettings(courseData.metadata.environment);
      }

      debug.log(`[CourseFactory] Successfully created course with ${course.totalHoles} holes`);
      return course;
    } catch (error) {
      debug.error(`[CourseFactory] Failed to create course: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a HoleEntity from hole data
   * @param {Object} holeData - Hole element data from JSON
   * @param {Object} courseData - Full course data for context
   * @returns {HoleEntity} Configured hole entity
   */
  async createHoleEntity(holeData, courseData) {
    try {
      // Create hole configuration compatible with existing HoleEntity
      const holeConfig = {
        index: holeData.index,
        description: holeData.name,
        par: holeData.par,

        // Convert array positions to Vector3
        holePosition: new THREE.Vector3(...holeData.holePosition),
        startPosition: new THREE.Vector3(...holeData.startPosition),

        // Course dimensions
        courseWidth: holeData.courseWidth || 6,
        courseLength: holeData.courseLength || 20,

        // Boundary shape if provided
        boundaryShape: holeData.boundaryShape
          ? holeData.boundaryShape.map(point => new THREE.Vector2(point[0], point[1]))
          : null,

        // Convert hazards to expected format
        hazards: this.convertHazards(holeData.hazards || []),

        // Convert bumpers to expected format
        bumpers: this.convertBumpers(holeData.bumpers || []),

        // Additional properties
        materials: holeData.materials,
        lighting: holeData.lighting,
        decorations: holeData.decorations,
        difficulty: holeData.difficulty
      };

      // Create HoleEntity using the existing class
      const holeEntity = new HoleEntity(
        this.game.physicsManager.getWorld(),
        holeConfig,
        this.game.scene,
        this.game
      );

      // Set world position based on hole data
      if (holeData.position) {
        holeEntity.worldHolePosition = new THREE.Vector3(...holeData.position);
      }

      await holeEntity.create();

      debug.log(`[CourseFactory] Created hole entity: ${holeData.name}`);
      return holeEntity;
    } catch (error) {
      debug.error(`[CourseFactory] Failed to create hole entity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert JSON hazard data to format expected by HoleEntity
   * @param {Array} hazards - Array of hazard objects from JSON
   * @returns {Array} Converted hazard array
   */
  convertHazards(hazards) {
    return hazards.map(hazard => ({
      ...hazard,
      position: hazard.position ? new THREE.Vector3(...hazard.position) : undefined,
      size: hazard.size
        ? new THREE.Vector3(hazard.size.x, hazard.size.y, hazard.size.z)
        : undefined,
      subShapes: hazard.subShapes
        ? hazard.subShapes.map(shape => ({
            ...shape,
            position: shape.position
              ? new THREE.Vector3(shape.position.x, 0, shape.position.z)
              : undefined
          }))
        : undefined
    }));
  }

  /**
   * Convert JSON bumper data to format expected by HoleEntity
   * @param {Array} bumpers - Array of bumper objects from JSON
   * @returns {Array} Converted bumper array
   */
  convertBumpers(bumpers) {
    return bumpers.map(bumper => ({
      ...bumper,
      position: bumper.position ? new THREE.Vector3(...bumper.position) : undefined,
      size: bumper.size ? new THREE.Vector3(...bumper.size) : undefined,
      rotation: bumper.rotation ? new THREE.Euler(...bumper.rotation) : undefined
    }));
  }

  /**
   * Apply environment settings from course metadata
   * @param {Object} environmentSettings - Environment configuration
   */
  async applyEnvironmentSettings(environmentSettings) {
    try {
      // Apply skybox
      if (environmentSettings.skybox && this.game.environmentManager) {
        await this.game.environmentManager.setSkybox(environmentSettings.skybox);
      }

      // Apply lighting settings
      if (environmentSettings.lighting && this.game.lightingManager) {
        this.game.lightingManager.applyLightingPreset(environmentSettings.lighting);
      }

      // Apply post-processing settings
      if (environmentSettings.postProcessing && this.game.postProcessingManager) {
        const pp = environmentSettings.postProcessing;

        if (pp.bloom) {
          this.game.postProcessingManager.setBloomIntensity(pp.bloom.intensity);
        }

        if (pp.toneMappingExposure) {
          this.game.postProcessingManager.setToneMappingExposure(pp.toneMappingExposure);
        }
      }

      // Apply fog settings
      if (environmentSettings.fog && environmentSettings.fog.enabled) {
        const fog = environmentSettings.fog;
        this.game.scene.fog = new THREE.Fog(parseInt(fog.color, 16), fog.near, fog.far);
      }

      debug.log('[CourseFactory] Applied environment settings');
    } catch (error) {
      debug.warn(`[CourseFactory] Failed to apply some environment settings: ${error.message}`);
    }
  }

  /**
   * Get the current hole start position
   * @param {Object} course - Course object
   * @returns {THREE.Vector3} World start position
   */
  getHoleStartPosition(course) {
    const currentHole = course.currentHoleEntity;
    if (!currentHole) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Return world position (HoleEntity handles the transformation)
    return currentHole.getWorldStartPosition();
  }

  /**
   * Get the current hole position
   * @param {Object} course - Course object
   * @returns {THREE.Vector3} World hole position
   */
  getHolePosition(course) {
    const currentHole = course.currentHoleEntity;
    if (!currentHole) {
      return new THREE.Vector3(0, 0, 0);
    }

    return currentHole.getWorldHolePosition();
  }

  /**
   * Get the current hole data
   * @param {Object} course - Course object
   * @returns {Object} Current hole data
   */
  getCurrentHole(course) {
    return course.currentHoleEntity;
  }

  /**
   * Set the current hole by index
   * @param {Object} course - Course object
   * @param {number} index - Hole index
   */
  setCurrentHole(course, index) {
    if (index >= 0 && index < course.holeEntities.length) {
      course.currentHoleIndex = index;
      course.currentHoleEntity = course.holeEntities[index];
      debug.log(`[CourseFactory] Set current hole to index ${index}`);
    } else {
      debug.warn(`[CourseFactory] Invalid hole index: ${index}`);
    }
  }
}

// Create static factory method for backwards compatibility
export const CourseCreationFactory = {
  async createFromJSON(courseData, game) {
    const factory = new CourseFactory(game);
    return await factory.createCourse(courseData);
  }
};
