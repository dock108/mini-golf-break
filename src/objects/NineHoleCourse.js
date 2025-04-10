import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CoursesManager } from '../managers/CoursesManager.js';
import { HoleEntity } from './HoleEntity';

/**
 * NineHoleCourse - A mini golf course with 9 distinct holes.
 */
export class NineHoleCourse extends CoursesManager {
    /**
     * Create a new NineHoleCourse instance
     * @param {object} game - Reference to the main game object
     * @param {object} options - Additional options for initialization
     */
    constructor(game, options = {}) {
        // Call parent constructor first
        super(game.scene, options.physicsWorld, {
            game: game,
            // Define a default start position for the course (e.g., near hole 1 tee)
            // This might be overridden by the first hole's specific config later.
            startPosition: new THREE.Vector3(0, 1, 10), // Example start
            autoCreate: false, // We handle creation manually
            ...options
        });

        this.game = game;
        this.scene = game.scene;
        this.physicsWorld = options.physicsWorld; // Ensure physics world is set

        // Hole completion and transition state
        this.isHoleComplete = false;
        this.pendingHoleTransition = false;
        this.isTransitioning = false;

        // --- Setup for 9 Holes ---
        this.totalHoles = 9;
        this.holeGroups = []; // Array to hold the THREE.Group for each hole
        this.holeConfigs = []; // We will define configs for 9 holes later

        console.log(`[NineHoleCourse] Initializing ${this.totalHoles} hole containers.`);
        for (let i = 0; i < this.totalHoles; i++) {
            const holeGroup = new THREE.Group();
            holeGroup.name = `Hole_${i + 1}_Group`; // Naming for clarity
            // Optionally add metadata
            holeGroup.userData = { holeIndex: i };
            this.scene.add(holeGroup); // Add group to the main scene
            this.holeGroups.push(holeGroup); // Store reference
            console.log(`[NineHoleCourse] Created and added ${holeGroup.name} to scene.`);
        }
        // --- End 9 Hole Setup ---

        // Define hole configurations for 9 holes
        this.holeConfigs = [
            // 🕳️ 1. The Gentle Starter
            {
                index: 0,
                description: "1. The Gentle Starter",
                par: 2,
                boundaryShape: [
                    new THREE.Vector2(-4, -8), new THREE.Vector2(-4, 8), new THREE.Vector2(4, 8), new THREE.Vector2(4, -8), new THREE.Vector2(-4, -8)
                ],
                startPosition: new THREE.Vector3(0, 0, 7),   // World
                holePosition: new THREE.Vector3(2, 0, -6),  // World
                hazards: [
                    {
                        type: 'sand',
                        shape: 'circle',
                        position: new THREE.Vector3(-1, 0, -1), // World
                        size: { radius: 2.5 },
                        depth: 0.15
                    }
                ],
                bumpers: [] // Bumpers assumed local relative to 0,0,0
            },
            // 🕳️ 2. Island Hop
            {
                index: 1,
                description: "2. Island Hop - Bridge Challenge",
                par: 4,
                boundaryShape: [
                    new THREE.Vector2(-5, -11), new THREE.Vector2(-5, 11), new THREE.Vector2(5, 11), new THREE.Vector2(5, -11), new THREE.Vector2(-5, -11)
                ],
                startPosition: new THREE.Vector3(-2, 0, 10),  // World
                holePosition: new THREE.Vector3(2, 0, -7), // World
                hazards: [
                    {
                        type: 'water',
                        shape: 'rectangle',
                        position: new THREE.Vector3(-3.25, 0, -2), // World
                        size: { width: 3.5, length: 10 },
                        depth: 0.15
                    },
                    {
                        type: 'water',
                        shape: 'rectangle',
                        position: new THREE.Vector3(3.25, 0, 4), // World
                        size: { width: 3.5, length: 10 },
                        depth: 0.15
                    },
                    {
                        type: 'water',
                        shape: 'circle',
                        position: new THREE.Vector3(0, 0, -5), // World
                        size: { radius: 1.2 },
                        depth: 0.15
                    }
                ],
                bumpers: [] // Bumpers assumed local relative to 0,0,0
            },
            // 🕳️ 3. Zig-Zag Alley
            {
                index: 2,
                description: "3. Zig-Zag Alley",
                par: 2,
                boundaryShape: [
                    new THREE.Vector2(-3, -10), new THREE.Vector2(-3, 10), new THREE.Vector2(3, 10), new THREE.Vector2(3, -10), new THREE.Vector2(-3, -10)
                ],
                startPosition: new THREE.Vector3(-2, 0, 9), // World
                holePosition: new THREE.Vector3(2, 0, -9), // World
                hazards: [],
                bumpers: [ // Bumpers assumed local relative to 0,0,0
                    { position: new THREE.Vector3(-1.5, 0.25, 5), size: new THREE.Vector3(3, 0.5, 0.2), rotation: new THREE.Euler(0, Math.PI / 4, 0) },
                    { position: new THREE.Vector3(1.5, 0.25, -5), size: new THREE.Vector3(3, 0.5, 0.2), rotation: new THREE.Euler(0, -Math.PI / 4, 0) }
                ]
            },
            // 🕳️ 4. Sinking Sands
            {
                index: 3,
                description: "4. Sinking Sands",
                par: 3,
                boundaryShape: [
                    new THREE.Vector2(-3.5, -12), new THREE.Vector2(-3.5, 12), new THREE.Vector2(3.5, 12), new THREE.Vector2(3.5, -12), new THREE.Vector2(-3.5, -12)
                ],
                startPosition: new THREE.Vector3(0, 0, 11), // World
                holePosition: new THREE.Vector3(0, 0, -11), // World
                hazards: [
                    {
                        type: 'sand',
                        shape: 'rectangle',
                        position: new THREE.Vector3(0, 0, 0), // World
                        size: { width: 7, length: 12 },
                        depth: 0.15
                    }
                ],
                bumpers: [] // Bumpers assumed local relative to 0,0,0
            },
            // 🕳️ 5. Narrow Escape
            {
                index: 4,
                description: "5. Narrow Escape",
                par: 3,
                boundaryShape: [
                    new THREE.Vector2(-4, -10), new THREE.Vector2(-4, 10), new THREE.Vector2(4, 10), new THREE.Vector2(4, -10), new THREE.Vector2(-4, -10)
                ],
                startPosition: new THREE.Vector3(0, 0, 9),
                holePosition: new THREE.Vector3(0, 0, -9),
                hazards: [
                    {
                        type: 'water',
                        shape: 'rectangle',
                        position: new THREE.Vector3(0, 0, 0),
                        size: { width: 3, length: 8 },
                        depth: 0.15
                    }
                ],
                bumpers: [
                    { position: new THREE.Vector3(-2.9, 0.25, 0), size: new THREE.Vector3(0.2, 0.5, 20), rotation: new THREE.Euler(0, 0, 0) },
                    { position: new THREE.Vector3(2.9, 0.25, 0), size: new THREE.Vector3(0.2, 0.5, 20), rotation: new THREE.Euler(0, 0, 0) }
                ]
            },

            // 🕳️ 6. Channel Obstacles (more difficult)
            {
                index: 5,
                description: "6. Channel Obstacles",
                par: 4,
                boundaryShape: [
                    new THREE.Vector2(-3.5, -12.5), new THREE.Vector2(-3.5, 12.5), new THREE.Vector2(3.5, 12.5), new THREE.Vector2(3.5, -12.5), new THREE.Vector2(-3.5, -12.5)
                ],
                startPosition: new THREE.Vector3(0, 0, 11),
                holePosition: new THREE.Vector3(0, 0, -11),
                hazards: [
                    {
                        type: 'water', shape: 'rectangle', position: new THREE.Vector3(-2.75, 0, 0), size: { width: 1.5, length: 25 }, depth: 0.2
                    },
                    {
                        type: 'water', shape: 'rectangle', position: new THREE.Vector3(2.75, 0, 0), size: { width: 1.5, length: 25 }, depth: 0.2
                    },
                    { 
                        type: 'sand', shape: 'circle', position: new THREE.Vector3(0, 0, -5), size: { radius: 1.5 }, depth: 0.15
                    }
                ],
                bumpers: [
                    { position: new THREE.Vector3(0, 0.25, 3), size: new THREE.Vector3(2, 0.5, 0.2), rotation: new THREE.Euler(0, Math.PI / 4, 0) },
                    { position: new THREE.Vector3(0, 0.25, -3), size: new THREE.Vector3(2, 0.5, 0.2), rotation: new THREE.Euler(0, -Math.PI / 4, 0) }
                ]
            },

            // 🕳️ 7. The Labyrinth (playable fix)
            {
                index: 6,
                description: "7. The Labyrinth",
                par: 5,
                boundaryShape: [
                    new THREE.Vector2(-8, -8), new THREE.Vector2(-8, 8), new THREE.Vector2(8, 8), new THREE.Vector2(8, -8), new THREE.Vector2(-8, -8)
                ],
                startPosition: new THREE.Vector3(-7, 0, 7),
                holePosition: new THREE.Vector3(7, 0, -7),
                hazards: [
                    { type: 'sand', shape: 'rectangle', position: new THREE.Vector3(2, 0, 2), size: { width: 3, length: 3 }, depth: 0.1 }
                ],
                bumpers: [
                    { position: new THREE.Vector3(-4, 0.25, 4), size: new THREE.Vector3(0.2, 0.5, 8), rotation: new THREE.Euler(0, 0, 0) },
                    { position: new THREE.Vector3(0, 0.25, 2), size: new THREE.Vector3(0.2, 0.5, 12), rotation: new THREE.Euler(0, 0, 0) },
                    { position: new THREE.Vector3(4, 0.25, -4), size: new THREE.Vector3(0.2, 0.5, 8), rotation: new THREE.Euler(0, 0, 0) }
                ]
            },

            // 🕳️ 8. Criss-Cross (fixed)
            {
                index: 7,
                description: "8. Criss-Cross",
                par: 3,
                boundaryShape: [
                    new THREE.Vector2(-7.5, -7.5), new THREE.Vector2(-7.5, 7.5), new THREE.Vector2(7.5, 7.5), new THREE.Vector2(7.5, -7.5), new THREE.Vector2(-7.5, -7.5)
                ],
                startPosition: new THREE.Vector3(-6, 0, 6),
                holePosition: new THREE.Vector3(6, 0, -6),
                hazards: [
                    { type: 'water', shape: 'rectangle', position: new THREE.Vector3(3, 0, -3), size: { width: 4, length: 9 }, depth: 0.15 },
                    { type: 'sand', shape: 'rectangle', position: new THREE.Vector3(-3, 0, 3), size: { width: 4, length: 9 }, depth: 0.15 }
                ],
                bumpers: []
            },

            // 🕳️ 9. The Final Shot (original)
            {
                index: 8,
                description: "9. The Final Shot",
                par: 4,
                boundaryShape: [
                    new THREE.Vector2(-10, -10), new THREE.Vector2(-10, 10), new THREE.Vector2(10, 10), new THREE.Vector2(10, -10), new THREE.Vector2(-10, -10)
                ],
                startPosition: new THREE.Vector3(0, 0, 9),
                holePosition: new THREE.Vector3(0, 0, -7), // Adjusted to be playable
                hazards: [
                    { type: 'water', shape: 'circle', position: new THREE.Vector3(0, 0, 0), size: { radius: 5 }, depth: 0.15 }
                ],
                bumpers: []
            }
        ];
         // Ensure totalHoles matches the number of configs provided
        if (this.holeConfigs.length !== this.totalHoles) {
            console.warn(`[NineHoleCourse] Mismatch between totalHoles (${this.totalHoles}) and provided holeConfigs (${this.holeConfigs.length}). Adjusting totalHoles.`);
            this.totalHoles = this.holeConfigs.length;
        }
        console.log(`[NineHoleCourse] Configured ${this.totalHoles} holes.`);


        // Initialize tracking - start at first hole (index 0)
        this.currentHoleIndex = 0;
        this.currentHoleEntity = null; // Renamed from currentHole to avoid confusion with groups
    }

    /**
     * Static factory method to create and initialize a new NineHoleCourse instance
     * @param {object} game - Reference to the main game object
     * @returns {Promise<NineHoleCourse>} The initialized course instance
     */
    static async create(game) {
        console.log('[NineHoleCourse.create] Start');
        const physicsWorld = game.physicsManager.getWorld();
        if (!physicsWorld) throw new Error('Physics world not available');

        const course = new NineHoleCourse(game, { physicsWorld });
        console.log('[NineHoleCourse.create] Instance created with 9 hole groups.');

        console.log('[NineHoleCourse.create] Awaiting initializeHole(0)...');
        const success = await course.initializeHole(0); // Initialize the first hole
        console.log(`[NineHoleCourse.create] initializeHole(0) returned: ${success}`);

        // --- CRITICAL CHECK ---
        console.log('[NineHoleCourse.create] Checking state AFTER initializeHole:');
        console.log(`  - course.currentHoleIndex: ${course.currentHoleIndex}`);
        console.log(`  - course.currentHoleEntity: ${course.currentHoleEntity ? 'Exists' : 'NULL'}`);
        console.log(`  - course.startPosition: ${course.startPosition ? course.startPosition.toArray().join(',') : 'UNDEFINED'}`);
        // --- END CRITICAL CHECK ---

        if (!success || !course.startPosition || !course.currentHoleEntity) {
            console.error('[NineHoleCourse.create] Initialization failed or state not set correctly!');
            throw new Error('Failed to initialize first hole or required state missing');
        }

        console.log('[NineHoleCourse.create] End');
        return course;
    }

    /**
     * Initialize a specific hole by index
     * @param {number} holeIndex - Index of the hole to initialize
     * @returns {boolean} Success
     */
    async initializeHole(holeIndex) {
        console.log(`[NineHoleCourse.initializeHole] Start (Index: ${holeIndex})`);
        try {
            // Validate index
            if (holeIndex < 0 || holeIndex >= this.totalHoles) {
                console.error(`[NineHoleCourse.initializeHole] Invalid hole index: ${holeIndex}`);
                return false;
            }
            
            // Get hole group and config
            const holeGroup = this.holeGroups[holeIndex];
            const holeConfig = this.holeConfigs[holeIndex];
            
            // Check if we have a valid configuration
            if (!holeConfig) {
                console.error(`[NineHoleCourse.initializeHole] No configuration found for hole ${holeIndex + 1}`);
                return false;
            }
            
            // Verify that the holeGroup is a valid THREE.Group and connected to the scene
            if (!holeGroup || !(holeGroup instanceof THREE.Group)) {
                console.error(`[NineHoleCourse.initializeHole] Invalid holeGroup for index ${holeIndex}`);
                return false;
            }
            
            // Verify that the holeGroup has a valid parent (the scene)
            if (!holeGroup.parent) {
                console.error(`[NineHoleCourse.initializeHole] holeGroup has no parent! Re-adding to scene...`);
                // Try to re-add it to the scene
                this.scene.add(holeGroup);
                if (!holeGroup.parent) {
                    console.error(`[NineHoleCourse.initializeHole] Failed to re-add holeGroup to scene!`);
                    return false;
                }
            }
            
            // Get scene and physical world
            const scene = holeGroup; // Use the group as the "scene"
            const physicsWorld = this.game.physicsManager.getWorld();
            
            console.log(
                `[NineHoleCourse.initializeHole] Found config for hole ${holeIndex + 1}: ${holeConfig.description}`
            );
            
            // If we already have a hole entity for this hole, just make it visible
            if (this.currentHoleEntity && this.currentHoleEntity.config.index === holeIndex) {
                console.log(`[NineHoleCourse.initializeHole] Hole ${holeIndex + 1} already initialized, making visible.`);
                // Just ensure it's visible
                this.holeGroups[holeIndex].visible = true;
                
                // Set as current hole index
                this.currentHoleIndex = holeIndex;
                this.currentHole = this.currentHoleEntity; // Set currentHole for BallManager compatibility
                return true;
            }
            
            // Hide all hole groups first
            this.holeGroups.forEach(group => {
                group.visible = false;
            });
            
            // Create a new HoleEntity for this hole
            console.log(`[NineHoleCourse.initializeHole] Creating HoleEntity for hole ${holeIndex + 1}...`);
            try {
                this.currentHoleEntity = new HoleEntity(physicsWorld, holeConfig, scene);
                
                // Initialize the hole (create visual and physics elements)
                await this.currentHoleEntity.init();
                
                console.log(`[NineHoleCourse.initializeHole] Called HoleEntity.init() for hole ${holeIndex + 1}`);
            } catch (error) {
                console.error(`[NineHoleCourse.initializeHole] Failed to create or initialize HoleEntity: ${error.message}`);
                return false;
            }
            
            // Make the current hole group visible
            holeGroup.visible = true;
            console.log(`[NineHoleCourse.initializeHole] Made ${holeGroup.name} visible.`);
            
            // Set current hole
            this.currentHoleIndex = holeIndex;
            this.currentHole = this.currentHoleEntity; // Set currentHole for BallManager compatibility
            console.log(`[NineHoleCourse.initializeHole] Set currentHoleIndex: ${holeIndex}`);
            
            // Set start position for the ball
            console.log(`[NineHoleCourse.initializeHole] Calling setStartPosition...`);
            this.setStartPosition(holeConfig.startPosition);
            console.log(`[NineHoleCourse.initializeHole] Returned from setStartPosition.`);
            
            console.log(`[NineHoleCourse.initializeHole] End (Success: true)`);
            return true;
        } catch (error) {
            console.error(`[NineHoleCourse.initializeHole] Error initializing hole ${holeIndex + 1}:`, error);
            console.log(`[NineHoleCourse.initializeHole] End (Success: false)`);
            return false;
        }
    }

     /**
     * Set the start position for the current hole
     * @param {THREE.Vector3} position - The start position
     */
    setStartPosition(position) {
        console.log('[NineHoleCourse.setStartPosition] Start');
        if (!position || !(position instanceof THREE.Vector3)) {
            console.error('[NineHoleCourse.setStartPosition] Invalid position received:', position);
            console.log('[NineHoleCourse.setStartPosition] End (Invalid)');
            return;
        }
        // This sets the *course's* overall start position, used by BallManager
        this.startPosition = position.clone();
        console.log('[NineHoleCourse.setStartPosition] Set course startPosition to:', this.startPosition.toArray().join(','));
        console.log('[NineHoleCourse.setStartPosition] End (Success)');
    }


    /**
     * Creates or loads the specified hole. (Currently just calls initializeHole)
     * @param {number} targetHoleNumber - The hole number to create (1-based)
     * @returns {Promise<boolean>} - True if successful, false otherwise
     */
    async createCourse(targetHoleNumber) {
        console.log(`[NineHoleCourse] Creating course for hole #${targetHoleNumber}`);

        if (!targetHoleNumber || targetHoleNumber < 1 || targetHoleNumber > this.totalHoles) {
            console.error(`[NineHoleCourse] Invalid hole number: ${targetHoleNumber}`);
            return false;
        }

        try {
            // Clear existing hole resources before initializing new one
            await this.clearCurrentHole();

            const holeIndex = targetHoleNumber - 1;
            const success = await this.initializeHole(holeIndex);

            if (!success) {
                console.error(`[NineHoleCourse] Failed to initialize hole #${targetHoleNumber}`);
                return false;
            }

            console.log(`[NineHoleCourse] Successfully prepared hole #${targetHoleNumber}`);
            return true;
        } catch (error) {
            console.error('[NineHoleCourse] Error creating course:', error);
            return false;
        }
    }


    /**
     * Handle ball entering hole
     * @param {number} holeIndex - The index of the hole the ball entered
     */
    onBallInHole(holeIndex) {
        console.log(`[NineHoleCourse] Ball entered hole ${holeIndex + 1}`);

        // Only process if this is the current hole and we're not already transitioning
        if (holeIndex === this.currentHoleIndex && !this.isTransitioning) {
            console.log('[NineHoleCourse] Setting hole completion flag');
            this.isHoleComplete = true;
        } else {
            console.log('[NineHoleCourse] Ignoring ball in hole - already transitioning or wrong hole', {
                currentHole: this.currentHoleIndex,
                ballHole: holeIndex,
                isTransitioning: this.isTransitioning
            });
        }
    }

    /**
     * Load the next hole in the 9-hole sequence.
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async loadNextHole() {
        if (this.isTransitioning) {
            console.warn('[NineHoleCourse] Already transitioning to next hole, ignoring request');
            return false;
        }

        console.log('[NineHoleCourse] Attempting to load next hole');
        this.isTransitioning = true;

        try {
            const nextHoleIndex = this.currentHoleIndex + 1;
            if (nextHoleIndex >= this.totalHoles) {
                console.warn('[NineHoleCourse] No more holes available. End of course.');
                // Handle end of game scenario here? e.g., show final scorecard
                this.game.stateManager.setState('GAME_OVER'); // Example state
                return false; // Indicate no *new* hole was loaded
            }

            console.log(`[NineHoleCourse] Transitioning from hole ${this.currentHoleIndex + 1} to ${nextHoleIndex + 1}`);

            // Clear current hole and initialize new one
            await this.clearCurrentHole();
            const success = await this.initializeHole(nextHoleIndex);

            if (!success) {
                throw new Error(`Failed to initialize hole ${nextHoleIndex + 1}`);
            }

            // Get the start position from the newly initialized course/hole config
            const startPosition = this.startPosition; // Reads the position set by initializeHole
            if (!startPosition) {
                console.error(`[NineHoleCourse] Start position not set after initializing hole ${nextHoleIndex + 1}`);
                throw new Error('Failed to get start position for ball creation');
            }

             // Reset ball using BallManager, which should use this.startPosition
            await this.game.ballManager.resetBall(startPosition);
            console.log('[NineHoleCourse] Ball reset to start position for new hole.');


            console.log(`[NineHoleCourse] Successfully loaded hole ${nextHoleIndex + 1}`);
            return true;
        } catch (error) {
            console.error('[NineHoleCourse] Failed to load next hole:', error);
            return false;
        } finally {
            // Always reset flags
            this.isTransitioning = false;
            this.isHoleComplete = false;
        }
    }

    /**
     * Clear the current hole's resources (visuals, physics).
     * Makes the corresponding THREE.Group invisible.
     */
    clearCurrentHole() {
        console.log(`[NineHoleCourse] Clearing resources for hole ${this.currentHoleIndex + 1}`);

        // Destroy the HoleEntity (which should clean up its CANNON bodies)
        if (this.currentHoleEntity) {
            this.currentHoleEntity.destroy();
            this.currentHoleEntity = null;
            this.currentHole = null; // Also clear the currentHole reference
            console.log('[NineHoleCourse] Destroyed current HoleEntity.');
        } else {
            console.warn('[NineHoleCourse] No current HoleEntity to destroy.');
        }

        // Hide the THREE.Group associated with the hole
        if (this.currentHoleIndex >= 0 && this.currentHoleIndex < this.holeGroups.length) {
            const holeGroup = this.holeGroups[this.currentHoleIndex];
            if (holeGroup) {
                holeGroup.visible = false;
                // Don't remove the group from the scene - just make it invisible
                // This keeps the parent references intact
                console.log(`[NineHoleCourse] Made ${holeGroup.name} invisible.`);
            } else {
                console.warn(`[NineHoleCourse] No THREE.Group found for index ${this.currentHoleIndex} to hide.`);
            }
        } else {
            console.warn(`[NineHoleCourse] Invalid currentHoleIndex (${this.currentHoleIndex}) for hiding group.`);
        }

        console.log('[NineHoleCourse] Hole resource cleanup complete');
        // Note: We resolve immediately, actual async cleanup might need Promises
        return Promise.resolve();
    }


    /**
     * Get the current hole number (1-based index for display)
     * @returns {number} The current hole number
     */
    getCurrentHoleNumber() {
        return this.currentHoleIndex + 1;
    }

    /**
     * Get the current hole configuration
     * @returns {Object | null} The current hole configuration or null
     */
    getCurrentHoleConfig() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holeConfigs.length) {
            console.warn(`[NineHoleCourse] Invalid hole index: ${this.currentHoleIndex}`);
            return null;
        }
        return this.holeConfigs[this.currentHoleIndex];
    }

    /**
     * Check if there is a next hole available
     * @returns {boolean} True if there is a next hole, false otherwise
     */
    hasNextHole() {
        const hasNext = this.currentHoleIndex < this.totalHoles - 1;
        console.log(`[NineHoleCourse] Checking for next hole: ${hasNext} (current: ${this.currentHoleIndex + 1}, total: ${this.totalHoles})`);
        return hasNext;
    }

    /**
     * Update loop for the course. Handles deferred hole transitions.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Handle deferred hole completion transition
        if (this.isHoleComplete && !this.pendingHoleTransition && !this.isTransitioning) {
            console.log('[NineHoleCourse] Processing deferred hole completion');
            this.pendingHoleTransition = true; // Prevents re-triggering

            // Schedule the transition for the next frame/tick to avoid issues during physics step etc.
            requestAnimationFrame(async () => {
                try {
                    await this.loadNextHole();
                } catch (error) {
                    console.error('[NineHoleCourse] Failed to transition to next hole:', error);
                     // Consider resetting state or showing an error message
                } finally {
                     // Reset flags whether successful or not, managed within loadNextHole now
                    this.pendingHoleTransition = false; // Allow completion processing again
                }
            });
        }

         // Update the current HoleEntity if it exists and has an update method
        if (this.currentHoleEntity && typeof this.currentHoleEntity.update === 'function') {
           this.currentHoleEntity.update(dt);
        }
    }

    // --- Overrides/Implementations for CoursesManager methods ---

    /**
     * Get the current hole position (WORLD coordinates) from the config
     * @returns {THREE.Vector3 | null}
     */
    getHolePosition() {
        const config = this.getCurrentHoleConfig();
        if (!config || !config.holePosition) {
            console.warn(`[NineHoleCourse] Config or holePosition missing for index ${this.currentHoleIndex}.`);
            return null;
        }
        return config.holePosition;
    }

    /**
     * Get the current hole's start position from the config
     * @returns {THREE.Vector3 | null}
     */
    getHoleStartPosition() {
        const config = this.getCurrentHoleConfig();
        if (!config || !config.startPosition) {
            console.warn(`[NineHoleCourse] Config or startPosition missing for index ${this.currentHoleIndex}.`);
            return null;
        }
        return config.startPosition;
    }

    /**
     * Get the current hole's par from the config
     * @returns {number} Par or 0 if unavailable
     */
    getHolePar() {
        const config = this.getCurrentHoleConfig();
        if (!config || typeof config.par !== 'number') {
            console.warn(`[NineHoleCourse] Config or par missing/invalid for index ${this.currentHoleIndex}.`);
            return 0; // Default par
        }
        return config.par;
    }

    // --- End Overrides ---
} 