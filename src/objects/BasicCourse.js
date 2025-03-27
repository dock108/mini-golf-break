import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CoursesManager } from './Course';

/**
 * BasicCourse - A mini golf course in space with support for multiple holes
 */
export class BasicCourse extends CoursesManager {
    /**
     * Create a new BasicCourse instance
     * @param {object} game - Reference to the main game object
     */
    constructor(game) {
        console.log('[BasicCourse] Initializing new course');
        
        // Get physics world from game
        const physicsWorld = game.physicsManager.getWorld();
        if (!physicsWorld) {
            console.error('[BasicCourse] Failed to get physics world from game');
            throw new Error('Physics world not available');
        }
        
        // Call the parent constructor with autoCreate: false to prevent duplicate creation
        super(game.scene, physicsWorld, { 
            game: game,
            startPosition: new THREE.Vector3(0, 0, 8),
            autoCreate: false
        });
        
        // Now we can safely set instance properties
        this.game = game;
        this.scene = game.scene;
        this.physicsWorld = physicsWorld;
        
        // Add hole completion state tracking
        this.isHoleComplete = false;
        this.pendingHoleTransition = false;
        
        // Log physics world state after initialization
        if (this.physicsWorld) {
            console.log('[BasicCourse] Physics world initialized:', {
                exists: true,
                bodies: this.physicsWorld.bodies ? this.physicsWorld.bodies.length : 0
            });
        } else {
            console.error('[BasicCourse] Physics world not properly initialized');
        }
        
        // Define hole configurations - flat layout
        this.holeConfigs = [
            // Hole 1 - Straight shot
            {
                holePosition: new THREE.Vector3(0, 0, -8),
                startPosition: new THREE.Vector3(0, 0, 8),
                courseWidth: 4,
                courseLength: 20,
                par: 3,
                description: "Straight Shot"
            },
            // Hole 2 - Dogleg right with sand trap
            {
                holePosition: new THREE.Vector3(4, 0, 8), // Hole is offset to the right
                startPosition: new THREE.Vector3(0, 0, -8),
                courseWidth: 6, // Wider course for the dogleg
                courseLength: 24, // Longer course for the dogleg
                par: 4, // Harder hole
                description: "Dogleg Right",
                hazards: [
                    {
                        type: 'sand',
                        position: new THREE.Vector3(2, 0, 0), // Sand trap in the middle
                        size: new THREE.Vector3(2, 0.2, 2)
                    }
                ]
            }
        ];
        
        // Set total holes from configs
        this.totalHoles = this.holeConfigs.length;
        console.log(`[BasicCourse] Configured ${this.totalHoles} holes`);
        
        // Initialize arrays
        this.courseObjects = [];
        this.physicsBodies = [];
        this.holes = new Array(this.totalHoles); // Initialize with correct size
        this.holeBodies = [];
        
        // Initialize the first hole
        this.initializeHole(0);
    }
    
    /**
     * Initialize a specific hole
     * @param {number} holeIndex - The index of the hole to initialize
     * @private
     */
    initializeHole(holeIndex) {
        console.log(`[BasicCourse] Initializing hole ${holeIndex + 1}`);
        
        // Update current hole index
        this.currentHoleIndex = holeIndex;
        
        // Get current hole config
        const holeConfig = this.holeConfigs[this.currentHoleIndex];
        if (!holeConfig) {
            console.error('[BasicCourse] Invalid hole configuration');
            return;
        }
        
        console.log(`[BasicCourse] Creating hole ${this.currentHoleIndex + 1}:`, {
            description: holeConfig.description,
            par: holeConfig.par,
            holePosition: holeConfig.holePosition,
            startPosition: holeConfig.startPosition,
            hazards: holeConfig.hazards ? holeConfig.hazards.length : 0
        });
        
        // Create the hole
        const holeMesh = this.createHole({
            ...holeConfig,
            holeIndex: this.currentHoleIndex
        });
        
        // Store the hole data at the correct index
        this.holes[holeIndex] = {
            mesh: holeMesh,
            par: holeConfig.par,
            startPosition: holeConfig.startPosition.clone(),
            holePosition: holeConfig.holePosition.clone(),
            config: holeConfig // Store the full config for reference
        };
        
        // Create physics bodies for the hole
        this.createHolePhysics(holeMesh, holeConfig);
        
        // Log the hole data for debugging
        console.log(`[BasicCourse] Hole ${this.currentHoleIndex + 1} initialized successfully`);
        console.log(`[BasicCourse] Hole data:`, {
            index: this.currentHoleIndex,
            startPosition: this.holes[holeIndex].startPosition,
            holePosition: this.holes[holeIndex].holePosition,
            par: this.holes[holeIndex].par
        });
        console.log(`[BasicCourse] Total holes in array: ${this.holes.length}`);
        
        // Step physics world to ensure bodies are properly initialized
        if (this.physicsWorld?.step) {
            for (let i = 0; i < 10; i++) { // Multiple steps to ensure stability
                this.physicsWorld.step(1/60);
            }
            console.log(`[BasicCourse] Physics world stepped after hole initialization`);
        }
    }
    
    /**
     * Override parent createCourse to use our initialization
     */
    createCourse() {
        // Clear existing hole resources first
        this.clearCurrentHole();
        
        // Get current hole number from state manager
        const currentHoleNumber = this.game.stateManager.getCurrentHoleNumber();
        const holeIndex = currentHoleNumber - 1; // Convert to zero-based index
        
        // Validate hole index
        if (holeIndex < 0 || holeIndex >= this.holeConfigs.length) {
            console.error(`[BasicCourse] Invalid hole index: ${holeIndex} (hole number: ${currentHoleNumber})`);
            console.error(`[BasicCourse] Available holes: ${this.holeConfigs.length}`);
            return;
        }
        
        console.log(`[BasicCourse] Creating hole ${currentHoleNumber} with config:`, this.holeConfigs[holeIndex]);
        
        // Update current hole index in both BasicCourse and parent CoursesManager
        this.currentHoleIndex = holeIndex;
        
        // Initialize the hole
        this.initializeHole(holeIndex);
        
        // Create any hazards for the hole
        const holeConfig = this.holeConfigs[holeIndex];
        if (holeConfig.hazards) {
            console.log(`[BasicCourse] Creating ${holeConfig.hazards.length} hazards for hole ${currentHoleNumber}`);
            holeConfig.hazards.forEach(hazard => {
                this.createHazard(hazard);
            });
        }
        
        // Log the current hole state
        console.log(`[BasicCourse] Created hole ${currentHoleNumber} with index ${holeIndex}`);
        console.log(`[BasicCourse] Current hole position:`, this.getHolePosition());
        console.log(`[BasicCourse] Current hole start position:`, this.getHoleStartPosition());
        console.log(`[BasicCourse] Total holes configured: ${this.holeConfigs.length}`);
        console.log(`[BasicCourse] Current hole index: ${this.currentHoleIndex}`);
        
        // Step physics world to ensure bodies are properly initialized
        if (this.physicsWorld?.step) {
            for (let i = 0; i < 10; i++) { // Multiple steps to ensure stability
                this.physicsWorld.step(1/60);
            }
            console.log(`[BasicCourse] Physics world stepped after hole creation`);
        }
    }
    
    /**
     * Create a single hole
     * @param {Object} holeConfig - Configuration for the hole
     * @returns {THREE.Group} The created hole mesh
     */
    createHole(holeConfig) {
        console.log(`[BasicCourse] Creating hole ${holeConfig.holeIndex + 1}:`, {
            description: holeConfig.description,
            par: holeConfig.par,
            holePosition: holeConfig.holePosition,
            startPosition: holeConfig.startPosition,
            hazards: holeConfig.hazards ? holeConfig.hazards.length : 0
        });

        const holeMesh = new THREE.Group();
        
        // Ensure valid dimensions
        const width = Math.max(1, holeConfig.courseWidth || 4);
        const length = Math.max(1, holeConfig.courseLength || 20);
        const height = 0.2;
        const holeRadius = 0.35;
        
        // Calculate center position for the hole
        const centerZ = (holeConfig.startPosition.z + holeConfig.holePosition.z) / 2;
        const centerX = (holeConfig.startPosition.x + holeConfig.holePosition.x) / 2;
        
        // Create green surface with hole
        const greenGeometry = new THREE.BoxGeometry(width, height, length);
        greenGeometry.translate(0, height/2, 0);

        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            transparent: false,
            opacity: 1.0,
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const greenSurface = new THREE.Mesh(greenGeometry, greenMaterial);
        holeMesh.add(greenSurface);
        
        // Store reference to material for fade out
        holeMesh.userData.material = greenMaterial;
        
        // Position the entire hole group at the center
        holeMesh.position.set(centerX, 0, centerZ);
        
        // Calculate relative positions
        const relativeHolePos = new THREE.Vector3(
            holeConfig.holePosition.x - centerX,
            0, // Keep at surface level
            holeConfig.holePosition.z - centerZ
        );

        const relativeStartPos = new THREE.Vector3(
            holeConfig.startPosition.x - centerX,
            0, // Keep at surface level
            holeConfig.startPosition.z - centerZ
        );

        // Create hole components
        this.createHoleGeometry(holeMesh, relativeHolePos, holeConfig.holeIndex);
        this.createStartMarker(holeMesh, relativeStartPos, holeConfig.holeIndex);
        this.createCourseBoundaries(
            holeMesh.position,
            width,
            length,
            1.0, // Wall height
            0.2, // Wall thickness
            holeConfig.holePosition,
            holeConfig.holeIndex
        );

        // Add to scene and tracking arrays
        this.scene.add(holeMesh);
        this.courseObjects.push(holeMesh);
        
        // Create physics bodies
        this.createHolePhysics(holeMesh, holeConfig);
        
        console.log(`[BasicCourse] Hole ${holeConfig.holeIndex + 1} created successfully`);
        return holeMesh;
    }
    
    /**
     * Create the boundaries/walls for the course
     * @param {THREE.Vector3} centerPosition - Center position of the course
     * @param {number} width - Width of the course
     * @param {number} length - Length of the course
     * @param {number} wallHeight - Height of the walls
     * @param {number} wallThickness - Thickness of the walls
     * @param {THREE.Vector3} holePosition - Position of the hole
     * @param {number} holeIndex - Index of the hole these boundaries belong to
     */
    createCourseBoundaries(centerPosition, width, length, wallHeight, wallThickness, holePosition, holeIndex) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D, // Brown
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0x3A1F00,
            emissiveIntensity: 0.3
        });
        
        // Calculate half dimensions for positioning
        const halfWidth = width / 2;
        const halfLength = length / 2;
        
        // Define walls with correct positioning relative to the green edges
        const walls = [
            // Left wall - align with left edge of green
            { 
                size: [wallThickness, wallHeight, length], 
                position: [centerPosition.x - halfWidth, centerPosition.y + wallHeight/2, centerPosition.z] 
            },
            // Right wall - align with right edge of green
            { 
                size: [wallThickness, wallHeight, length], 
                position: [centerPosition.x + halfWidth, centerPosition.y + wallHeight/2, centerPosition.z] 
            },
            // Back wall (behind hole) - align with back edge of green
            { 
                size: [width, wallHeight, wallThickness], 
                position: [centerPosition.x, centerPosition.y + wallHeight/2, centerPosition.z - halfLength] 
            },
            // Front wall (behind tee) - align with front edge of green
            { 
                size: [width, wallHeight, wallThickness], 
                position: [centerPosition.x, centerPosition.y + wallHeight/2, centerPosition.z + halfLength] 
            }
        ];
        
        // Create all the wall meshes
        walls.forEach(wall => {
            // Create geometry for the wall
            const wallGeometry = new THREE.BoxGeometry(wall.size[0], wall.size[1], wall.size[2]);
            
            // Create mesh for the wall
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(wall.position[0], wall.position[1], wall.position[2]);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            wallMesh.userData = { holeIndex: holeIndex };
            
            // Add to scene and tracking array
            this.scene.add(wallMesh);
            this.courseObjects.push(wallMesh);
            
            // Create physics body for the wall
            if (this.physicsWorld) {
                const wallBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(wall.position[0], wall.position[1], wall.position[2]),
                    shape: new CANNON.Box(new CANNON.Vec3(wall.size[0]/2, wall.size[1]/2, wall.size[2]/2)),
                    material: this.physicsWorld.wallMaterial || this.physicsWorld.defaultMaterial
                });
                
                // Store hole index in user data
                wallBody.userData = { holeIndex: holeIndex };
                
                this.physicsWorld.addBody(wallBody);
                this.physicsBodies.push(wallBody);
            }
        });
    }
    
    /**
     * Create the hole geometry
     * @param {THREE.Group} parentGroup - The parent group to add the hole to
     * @param {THREE.Vector3} position - Position of the hole
     * @param {number} holeIndex - Index of the hole this geometry belongs to
     */
    createHoleGeometry(parentGroup, position, holeIndex) {
        const holeRadius = 0.35;
        const holeDepth = 0.3;
        const surfaceHeight = 0.2; // Height of the green surface

        // Create hole bottom (black circle at bottom of hole)
        const holeBottomGeometry = new THREE.CircleGeometry(holeRadius, 32);
        const holeBottomMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide
        });
        const holeBottom = new THREE.Mesh(holeBottomGeometry, holeBottomMaterial);
        holeBottom.rotation.x = -Math.PI / 2;
        holeBottom.position.copy(position);
        holeBottom.position.y = surfaceHeight - holeDepth + 0.005; // Adjusted for green surface height
        holeBottom.userData = { holeIndex: holeIndex };
        parentGroup.add(holeBottom);
        this.courseObjects.push(holeBottom);

        // Create hole walls (black cylinder for depth)
        const holeWallGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
        const holeWallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.BackSide // Only render inside of cylinder
        });
        const holeWall = new THREE.Mesh(holeWallGeometry, holeWallMaterial);
        holeWall.position.copy(position);
        holeWall.position.y = surfaceHeight - holeDepth/2; // Adjusted for green surface height
        holeWall.userData = { holeIndex: holeIndex };
        parentGroup.add(holeWall);
        this.courseObjects.push(holeWall);
        
        // Create visible rim around the hole
        const rimGeometry = new THREE.RingGeometry(holeRadius - 0.02, holeRadius + 0.05, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Lay flat
        rim.position.copy(position);
        rim.position.y = surfaceHeight + 0.001; // Adjusted for green surface height
        rim.userData = { holeIndex: holeIndex };
        parentGroup.add(rim);
        this.courseObjects.push(rim);

        // Create hole opening (black circle at surface level)
        const holeOpeningGeometry = new THREE.CircleGeometry(holeRadius - 0.02, 32);
        const holeOpeningMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide
        });
        const holeOpening = new THREE.Mesh(holeOpeningGeometry, holeOpeningMaterial);
        holeOpening.rotation.x = -Math.PI / 2;
        holeOpening.position.copy(position);
        holeOpening.position.y = surfaceHeight + 0.002; // Adjusted for green surface height
        holeOpening.userData = { holeIndex: holeIndex };
        parentGroup.add(holeOpening);
        this.courseObjects.push(holeOpening);
        
        // Create hole body (for collision detection)
        if (this.physicsWorld) {
            const worldPosition = new THREE.Vector3();
            rim.getWorldPosition(worldPosition);
            
            const holeBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(worldPosition.x, worldPosition.y, worldPosition.z),
                type: CANNON.Body.STATIC,
                collisionResponse: false,
                isTrigger: true
            });
            
            const holeShape = new CANNON.Cylinder(holeRadius, holeRadius, 0.1, 16);
            holeBody.addShape(holeShape);
            holeBody.collisionFilterGroup = 2;
            holeBody.collisionFilterMask = 4;
            holeBody.userData = { type: 'hole', holeIndex: holeIndex };
            
            this.physicsWorld.addBody(holeBody);
            this.physicsBodies.push(holeBody);
            this.holeBodies.push(holeBody);
        }
    }
    
    /**
     * Create a visual marker for the starting position
     * @param {THREE.Group} parentGroup - The parent group to add the marker to
     * @param {THREE.Vector3} position - Position for the start marker
     * @param {number} holeIndex - Index of the hole this marker belongs to
     */
    createStartMarker(parentGroup, position, holeIndex) {
        const surfaceHeight = 0.2; // Height of the green surface
        
        // Create base
        const teeBaseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeBaseMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077cc,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const teeBase = new THREE.Mesh(teeBaseGeometry, teeBaseMaterial);
        teeBase.position.copy(position);
        teeBase.position.y = surfaceHeight + 0.03; // Adjusted for green surface height
        teeBase.receiveShadow = true;
        teeBase.userData = { holeIndex: holeIndex };
        
        parentGroup.add(teeBase);
        this.courseObjects.push(teeBase);
        
        // Create dot for ball placement
        const teeDotGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24);
        const teeDotMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.3
        });
        
        const teeDot = new THREE.Mesh(teeDotGeometry, teeDotMaterial);
        teeDot.position.copy(position);
        teeDot.position.y = surfaceHeight + 0.04; // Adjusted for green surface height
        teeDot.receiveShadow = true;
        teeDot.userData = { holeIndex: holeIndex };
        
        parentGroup.add(teeDot);
        this.courseObjects.push(teeDot);

        // Create landing pad physics body for hole transitions
        if (this.physicsWorld && holeIndex > 0) { // Only for holes after the first one
            const worldPosition = new THREE.Vector3();
            teeBase.getWorldPosition(worldPosition);
            
            // Create a larger trigger area around the tee
            const landingPadBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(worldPosition.x, worldPosition.y, worldPosition.z),
                shape: new CANNON.Cylinder(1.0, 1.0, 0.5, 16), // Larger radius than visual tee
                type: CANNON.Body.STATIC,
                collisionResponse: true, // Enable collision response to stop the ball
                material: this.physicsWorld.groundMaterial || this.physicsWorld.defaultMaterial
            });
            
            // Add a smaller trigger zone for detecting successful landing
            const triggerShape = new CANNON.Cylinder(0.4, 0.4, 0.5, 16);
            const triggerBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(worldPosition.x, worldPosition.y + 0.25, worldPosition.z),
                shape: triggerShape,
                type: CANNON.Body.STATIC,
                collisionResponse: false,
                isTrigger: true
            });
            
            // Set collision groups
            triggerBody.collisionFilterGroup = 2; // Same as hole group
            triggerBody.collisionFilterMask = 4;  // Collide with ball group
            
            // Tag the trigger as a landing pad
            triggerBody.userData = { 
                type: 'landing_pad',
                holeIndex: holeIndex
            };
            
            this.physicsWorld.addBody(landingPadBody);
            this.physicsWorld.addBody(triggerBody);
            this.physicsBodies.push(landingPadBody);
            this.physicsBodies.push(triggerBody);
        }
    }
    
    /**
     * Update loop for the course. Called every frame.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Handle deferred hole completion
        if (this.isHoleComplete && !this.pendingHoleTransition) {
            console.log('[BasicCourse] Processing deferred hole completion');
            this.pendingHoleTransition = true;
            
            // Schedule the transition for the next frame
            requestAnimationFrame(async () => {
                try {
                    await this.loadNextHole();
                } catch (error) {
                    console.error('[BasicCourse] Failed to transition to next hole:', error);
                } finally {
                    this.isHoleComplete = false;
                    this.pendingHoleTransition = false;
                }
            });
        }
    }

    /**
     * Handle ball entering hole
     * @param {number} holeIndex - The index of the hole the ball entered
     */
    onBallInHole(holeIndex) {
        console.log(`[BasicCourse] Ball entered hole ${holeIndex + 1}`);
        
        // Only process if this is the current hole
        if (holeIndex === this.currentHoleIndex) {
            console.log('[BasicCourse] Setting hole completion flag');
            this.isHoleComplete = true;
        }
    }

    /**
     * Load the next hole
     * @returns {Promise<void>}
     */
    async loadNextHole() {
        console.log('[BasicCourse] Attempting to load next hole');
        
        // Check if we have more holes - using zero-based indexing internally
        if (this.currentHoleIndex >= this.totalHoles - 1) {
            console.warn('[BasicCourse] No more holes available');
            return;
        }
        
        // Store current hole index before incrementing
        const previousHoleIndex = this.currentHoleIndex;
        const nextHoleIndex = previousHoleIndex + 1;
        
        console.log(`[BasicCourse] Transitioning from hole ${previousHoleIndex + 1} to ${nextHoleIndex + 1}`);
        
        try {
            // Clear current hole and reset physics world
            console.log('[BasicCourse] Clearing current hole and resetting physics world');
            
            // Remove all physics bodies first
            if (this.physicsWorld) {
                console.log('[BasicCourse] Removing all physics bodies before clearing hole');
                this.physicsBodies.forEach(body => {
                    if (body && body.shapes) {
                        body.shapes.forEach(shape => {
                            body.removeShape(shape);
                        });
                        this.physicsWorld.removeBody(body);
                    }
                });
                this.physicsBodies = [];
                this.holeBodies = [];
            }
            
            // Clear course objects but preserve holes array
            const currentObjects = [...this.courseObjects];
            currentObjects.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                this.scene.remove(obj);
            });
            this.courseObjects = [];
            
            // Wait for a frame to ensure cleanup is complete
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Update current hole index
            this.currentHoleIndex = nextHoleIndex;
            console.log(`[BasicCourse] Creating hole ${this.currentHoleIndex + 1}`);
            
            // Create new hole
            this.initializeHole(this.currentHoleIndex);
            
            // Create hazards for the new hole
            const currentHoleConfig = this.holeConfigs[this.currentHoleIndex];
            if (currentHoleConfig && currentHoleConfig.hazards) {
                console.log(`[BasicCourse] Creating ${currentHoleConfig.hazards.length} hazards for hole ${this.currentHoleIndex + 1}`);
                currentHoleConfig.hazards.forEach(hazard => {
                    this.createHazard(hazard);
                });
            }
            
            console.log(`[BasicCourse] Successfully loaded hole ${this.currentHoleIndex + 1}`);
        } catch (error) {
            console.error('[BasicCourse] Failed to load next hole:', error);
            // Roll back to previous hole index
            this.currentHoleIndex = previousHoleIndex;
            throw error;
        }
    }

    /**
     * Get the current hole configuration
     * @returns {Object} The current hole configuration
     */
    getCurrentHoleConfig() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holeConfigs.length) {
            console.warn(`[BasicCourse] Invalid hole index: ${this.currentHoleIndex}`);
            return null;
        }
        return this.holeConfigs[this.currentHoleIndex];
    }

    /**
     * Create a hazard on the course
     * @param {Object} hazardConfig - Configuration for the hazard
     */
    createHazard(hazardConfig) {
        console.log(`[BasicCourse] Creating hazard of type: ${hazardConfig.type}`);
        
        if (hazardConfig.type === 'sand') {
            // Create sand trap
            const sandGeometry = new THREE.BoxGeometry(
                hazardConfig.size.x,
                hazardConfig.size.y,
                hazardConfig.size.z
            );
            
            const sandMaterial = new THREE.MeshStandardMaterial({
                color: 0xF4A460, // Sandy brown color
                roughness: 0.8,
                metalness: 0.1
            });
            
            const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial);
            sandMesh.position.copy(hazardConfig.position);
            sandMesh.position.y = hazardConfig.size.y / 2; // Center vertically
            
            this.scene.add(sandMesh);
            this.courseObjects.push(sandMesh);
            
            // Add physics body for the sand trap
            if (this.physicsWorld) {
                const sandBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(
                        hazardConfig.position.x,
                        hazardConfig.position.y + hazardConfig.size.y / 2,
                        hazardConfig.position.z
                    ),
                    shape: new CANNON.Box(new CANNON.Vec3(
                        hazardConfig.size.x / 2,
                        hazardConfig.size.y / 2,
                        hazardConfig.size.z / 2
                    )),
                    material: this.physicsWorld.sandMaterial || this.physicsWorld.defaultMaterial
                });
                
                this.physicsWorld.addBody(sandBody);
                this.physicsBodies.push(sandBody);
                console.log('[BasicCourse] Added sand trap physics body');
            }
        }
        // Add more hazard types here as needed
    }

    /**
     * Clear the current hole and its resources
     */
    clearCurrentHole() {
        console.log('[BasicCourse] Clearing current hole resources');
        
        // Log current state
        console.log(`[BasicCourse] Current state before cleanup:
            - Course objects: ${this.courseObjects.length}
            - Physics bodies: ${this.physicsBodies.length}
            - Holes: ${this.holes.length}
            - Hole bodies: ${this.holeBodies.length}
            - Physics world: ${this.physicsWorld ? 'exists' : 'undefined'}`);
        
        // Remove existing hole meshes and dispose of resources
        console.log(`[BasicCourse] Removing ${this.courseObjects.length} course objects`);
        const currentObjects = [...this.courseObjects];
        currentObjects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            this.scene.remove(obj);
        });
        
        // Clear physics bodies
        console.log(`[BasicCourse] Removing ${this.physicsBodies.length} physics bodies`);
        if (this.physicsWorld) {
            // Remove all physics bodies from the world
            this.physicsBodies.forEach(body => {
                if (body && body.shapes) {
                    // Remove all shapes from the body first
                    body.shapes.forEach(shape => {
                        body.removeShape(shape);
                    });
                    this.physicsWorld.removeBody(body);
                }
            });
            
            // Wait for a frame to ensure physics world is updated
            this.physicsWorld.update();
        }
        
        // Clear arrays but preserve holes array
        this.courseObjects = [];
        this.physicsBodies = [];
        this.holeBodies = [];
        
        console.log(`[BasicCourse] Cleanup complete. Current state:
            - Course objects: ${this.courseObjects.length}
            - Physics bodies: ${this.physicsBodies.length}
            - Holes: ${this.holes.length}
            - Hole bodies: ${this.holeBodies.length}`);
    }

    /**
     * Get the current hole number (1-based index)
     * @returns {number} The current hole number
     */
    getCurrentHoleNumber() {
        return this.currentHoleIndex + 1;
    }

    /**
     * Get the current hole mesh
     * @returns {THREE.Mesh} The current hole's mesh
     */
    getCurrentHoleMesh() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holes.length) {
            console.warn(`[BasicCourse] Invalid hole index for mesh: ${this.currentHoleIndex}`);
            return null;
        }
        return this.holes[this.currentHoleIndex].mesh;
    }

    /**
     * Check if there is a next hole available
     * @returns {boolean} True if there is a next hole, false otherwise
     */
    hasNextHole() {
        const hasNext = this.currentHoleIndex < this.totalHoles - 1;
        console.log(`[BasicCourse] Checking for next hole: ${hasNext} (current: ${this.currentHoleIndex + 1}, total: ${this.totalHoles})`);
        return hasNext;
    }

    /**
     * Create physics bodies for the hole
     * @param {THREE.Group} holeMesh - The hole mesh group
     * @param {Object} holeConfig - Configuration for the hole
     * @private
     */
    createHolePhysics(holeMesh, holeConfig) {
        if (!this.physicsWorld) {
            console.error('[BasicCourse] Physics world not available for hole physics creation');
            return;
        }

        console.log(`[BasicCourse] Creating physics bodies for hole ${holeConfig.holeIndex + 1}`);
        
        // Safely get current body count
        const currentBodyCount = this.physicsWorld.bodies ? this.physicsWorld.bodies.length : 0;
        console.log(`[BasicCourse] Current physics world body count: ${currentBodyCount}`);

        const width = Math.max(1, holeConfig.courseWidth || 4);
        const length = Math.max(1, holeConfig.courseLength || 20);
        const height = 0.2;
        const holeRadius = 0.35;

        // Calculate center position for the hole
        const centerZ = (holeConfig.startPosition.z + holeConfig.holePosition.z) / 2;
        const centerX = (holeConfig.startPosition.x + holeConfig.holePosition.x) / 2;

        // Calculate relative positions from center
        const relativeHolePos = new THREE.Vector3(
            holeConfig.holePosition.x - centerX,
            0, // Keep at surface level
            holeConfig.holePosition.z - centerZ
        );

        const relativeStartPos = new THREE.Vector3(
            holeConfig.startPosition.x - centerX,
            0, // Keep at surface level
            holeConfig.startPosition.z - centerZ
        );

        // Create main surface body with proper position
        const greenBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            position: new CANNON.Vec3(
                centerX,
                0, // Position at y=0 and let shapes handle height
                centerZ
            ),
            material: this.physicsWorld.groundMaterial || this.physicsWorld.defaultMaterial,
            collisionResponse: true
        });

        // Add main surface shape
        const mainSurface = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
        greenBody.addShape(mainSurface, new CANNON.Vec3(0, height/2, 0));

        // Add thicker backup box below to prevent tunneling
        const backupBox = new CANNON.Box(new CANNON.Vec3(width/2, height, length/2));
        greenBody.addShape(backupBox, new CANNON.Vec3(0, -height/2, 0));
        
        // Store hole index in user data
        greenBody.userData = { 
            holeIndex: holeConfig.holeIndex,
            type: 'green'
        };
        
        // Set up collision filters for the green surface
        greenBody.collisionFilterGroup = 1;
        greenBody.collisionFilterMask = -1; // Collide with everything

        // Log the green surface body creation
        console.log('[BasicCourse] Created green surface body:', {
            position: greenBody.position,
            dimensions: {
                width: width,
                length: length,
                height: height
            },
            collisionGroup: greenBody.collisionFilterGroup,
            collisionMask: greenBody.collisionFilterMask,
            shapes: greenBody.shapes.length
        });

        // Add the green surface body to the physics world
        this.physicsWorld.addBody(greenBody);
        this.physicsBodies.push(greenBody);
        console.log('[PhysicsWorld] Added body of type: green');

        // Create hole trigger body
        const holeTriggerBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            position: new CANNON.Vec3(
                holeConfig.holePosition.x,
                0,
                holeConfig.holePosition.z
            ),
            collisionResponse: false,
            isTrigger: true
        });

        // Add hole trigger shape
        const holeTriggerShape = new CANNON.Cylinder(holeRadius, holeRadius, height, 16);
        holeTriggerBody.addShape(holeTriggerShape);
        holeTriggerBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

        // Set up collision filters for the hole trigger
        holeTriggerBody.collisionFilterGroup = 2;
        holeTriggerBody.collisionFilterMask = 1; // Only collide with the ball

        // Store hole data
        holeTriggerBody.userData = {
            type: 'hole',
            holeIndex: holeConfig.holeIndex
        };

        // Add the hole trigger to the physics world
        this.physicsWorld.addBody(holeTriggerBody);
        this.physicsBodies.push(holeTriggerBody);
        this.holeBodies.push(holeTriggerBody);

        // Step physics world to ensure bodies are properly initialized
        if (this.physicsWorld.step) {
            for (let i = 0; i < 10; i++) { // Multiple steps to ensure stability
                this.physicsWorld.step(1/60);
            }
        }

        console.log(`[BasicCourse] Physics bodies created for hole ${holeConfig.holeIndex + 1}`);
    }
} 