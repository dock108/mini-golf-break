import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Course } from './Course';

/**
 * BasicCourse - A mini golf course in space with support for multiple holes
 */
export class BasicCourse extends Course {
    /**
     * Create a new BasicCourse instance
     * @param {object} game - Reference to the main game object
     */
    constructor(game) {
        // Call the parent constructor
        super(game.scene, game.physicsManager.getWorld(), { 
            game: game,
            startPosition: new THREE.Vector3(0, 0, 8),
            autoCreate: false
        });
        
        // Reference to the main game
        this.game = game;
        
        // Get scene from game
        this.scene = game.scene;
        
        // Initialize course properties
        this.holes = [];
        this.currentHoleIndex = 0;
        this.totalHoles = 2; // Start with 2 holes for testing
        
        // Initialize arrays for tracking objects
        this.courseObjects = [];
        this.physicsBodies = [];
        this.holeBodies = [];
        this.obstacles = [];
        this.obstacleBodies = [];
        
        // Define vertical spacing between holes
        this.VERTICAL_HOLE_SPACING = 35; // Reduced from 100 to 35 units for a shorter fall
        
        // Define hole configurations - stacked vertically
        this.holes = [
            // Hole 1 (highest position)
            {
                holePosition: new THREE.Vector3(0, 0, -8),
                startPosition: new THREE.Vector3(0, 0, 8),
                courseWidth: 4,
                courseLength: 20,
                par: 3,
                mesh: null // Store reference to hole mesh
            },
            // Hole 2 (below Hole 1)
            {
                holePosition: new THREE.Vector3(0, -this.VERTICAL_HOLE_SPACING, 8), // Move hole to front
                startPosition: new THREE.Vector3(0, -this.VERTICAL_HOLE_SPACING, -8), // Start where hole 1 ended
                courseWidth: 4,
                courseLength: 20,
                par: 3,
                mesh: null
            }
        ];
        
        // Initialize hole states
        this.holeStates = new Map();
        for (let i = 0; i < this.totalHoles; i++) {
            this.holeStates.set(i, {
                completed: false,
                strokes: 0,
                par: 3
            });
        }
        
        // Multi-hole configuration
        this.currentHoleIndex = 0;
        this.totalHoles = 2; // Initially supporting 2 holes
        
        // Now that everything is initialized, create the course
        this.createCourse();
    }
    
    /**
     * Create the course with all holes
     */
    createCourse() {
        // Use the existing this.holes array which contains our hole configurations
        this.holes = this.holes.map((holeConfig, index) => {
            // Create hole mesh and physics
            const holeMesh = this.createHole({
                ...holeConfig,
                holeIndex: index, // Add the hole index to the config
                startPosition: new THREE.Vector3(
                    holeConfig.startPosition.x,
                    -index * this.VERTICAL_HOLE_SPACING,
                    holeConfig.startPosition.z
                ),
                holePosition: new THREE.Vector3(
                    holeConfig.holePosition.x,
                    -index * this.VERTICAL_HOLE_SPACING,
                    holeConfig.holePosition.z
                )
            });
            
            return {
                mesh: holeMesh,
                par: holeConfig.par,
                startPosition: new THREE.Vector3(
                    holeConfig.startPosition.x,
                    -index * this.VERTICAL_HOLE_SPACING,
                    holeConfig.startPosition.z
                ),
                holePosition: new THREE.Vector3(
                    holeConfig.holePosition.x,
                    -index * this.VERTICAL_HOLE_SPACING,
                    holeConfig.holePosition.z
                )
            };
        });

        // Set current hole
        this.currentHoleIndex = 0;
    }
    
    /**
     * Create a single hole
     * @param {Object} holeConfig - Configuration for the hole
     */
    createHole(holeConfig) {
        const holeMesh = new THREE.Group();
        
        // Ensure valid dimensions
        const width = Math.max(1, holeConfig.courseWidth || 4);
        const length = Math.max(1, holeConfig.courseLength || 20);
        const height = 0.2;
        const holeRadius = 0.35;
        
        // Create green surface with hole
        // First create the outer shape (rectangle)
        const greenShape = new THREE.Shape();
        greenShape.moveTo(-width/2, -length/2);
        greenShape.lineTo(width/2, -length/2);
        greenShape.lineTo(width/2, length/2);
        greenShape.lineTo(-width/2, length/2);
        greenShape.lineTo(-width/2, -length/2);

        // Calculate hole position relative to the green's center
        const relativeHolePos = new THREE.Vector3(
            0, // Keep x centered
            0, // Keep at surface level
            holeConfig.holePosition.z - ((holeConfig.startPosition.z + holeConfig.holePosition.z) / 2) // Offset from center in z
        );

        // Create geometry from the shape - no hole cut yet
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
        
        // Calculate center position for the hole
        const centerZ = (holeConfig.startPosition.z + holeConfig.holePosition.z) / 2;
        
        // Position the entire hole group at the center
        holeMesh.position.set(
            holeConfig.startPosition.x,
            holeConfig.startPosition.y,
            centerZ
        );
        
        this.scene.add(holeMesh);
        this.courseObjects.push(holeMesh);

        // Create physics bodies for the green surface
        if (this.physicsWorld) {
            // Create main surface body
            const greenBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(
                    holeMesh.position.x,
                    holeMesh.position.y,
                    holeMesh.position.z
                ),
                shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2)),
                material: this.physicsWorld.groundMaterial || this.physicsWorld.defaultMaterial
            });
            
            // Store hole index in user data
            greenBody.userData = { holeIndex: holeConfig.holeIndex };
            
            this.physicsWorld.addBody(greenBody);
            this.physicsBodies.push(greenBody);

            // Create a cylinder body for the hole area
            const holeBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(
                    holeMesh.position.x + relativeHolePos.x,
                    holeMesh.position.y,
                    holeMesh.position.z + relativeHolePos.z
                ),
                shape: new CANNON.Cylinder(holeRadius, holeRadius, height * 2, 16),
                collisionResponse: false,
                isTrigger: true
            });

            holeBody.collisionFilterGroup = 2; // Holes group
            holeBody.collisionFilterMask = 4;  // Collide with ball group
            holeBody.userData = { type: 'hole', holeIndex: holeConfig.holeIndex };

            this.physicsWorld.addBody(holeBody);
            this.physicsBodies.push(holeBody);
            this.holeBodies.push(holeBody);
        }

        // Create the hole walls and bottom
        this.createHoleGeometry(holeMesh, relativeHolePos, holeConfig.holeIndex);

        // Create the start marker (tee)
        const relativeStartPos = new THREE.Vector3(
            0, // Keep x centered
            0, // Keep at surface level
            holeConfig.startPosition.z - centerZ // Offset from center in z
        );
        this.createStartMarker(holeMesh, relativeStartPos, holeConfig.holeIndex);

        // Create boundaries/walls
        this.createCourseBoundaries(
            holeMesh.position,
            width,
            length,
            1.0, // Wall height
            0.2, // Wall thickness
            holeConfig.holePosition,
            holeConfig.holeIndex
        );
        
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
     * Get the current hole mesh
     * @returns {THREE.Mesh} The current hole's mesh
     */
    getCurrentHoleMesh() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holes.length) {
            return null;
        }
        return this.holes[this.currentHoleIndex].mesh;
    }
    
    /**
     * Check if there is a next hole available
     * @returns {boolean} True if there is a next hole, false otherwise
     */
    hasNextHole() {
        return this.currentHoleIndex < this.holes.length - 1;
    }
    
    /**
     * Load the next hole
     */
    loadNextHole() {
        if (this.hasNextHole()) {
            this.currentHoleIndex++;
            return true;
        }
        return false;
    }
    
    /**
     * Get the distance to the next hole
     * @returns {number} The vertical distance to the next hole
     */
    getDistanceToNextHole() {
        return this.VERTICAL_HOLE_SPACING;
    }
    
    /**
     * Get the start position for the current hole
     * @returns {THREE.Vector3} The start position
     */
    getHoleStartPosition() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holes.length) {
            return new THREE.Vector3(0, 0, 0);
        }
        return this.holes[this.currentHoleIndex].startPosition.clone();
    }
    
    /**
     * Get the current hole's hole position
     * @returns {THREE.Vector3} The current hole's position
     */
    getHolePosition() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holes.length) {
            return new THREE.Vector3(0, 0, 0);
        }
        return this.holes[this.currentHoleIndex].holePosition.clone();
    }
    
    /**
     * Get the par for a specific hole number
     * @param {number} holeNumber - The hole number (1-based)
     * @returns {number} The par for the hole
     */
    getHolePar(holeNumber) {
        // Convert to 0-based index
        const index = holeNumber - 1;
        
        // Check if hole exists
        if (index < 0 || index >= this.holes.length) {
            console.warn(`Invalid hole number: ${holeNumber}`);
            return 3; // Default par
        }
        
        // Return the par from the hole configuration
        return this.holes[index].par;
    }
    
    /**
     * Get current hole number (1-based)
     */
    getCurrentHoleNumber() {
        return this.currentHoleIndex + 1;
    }
    
    /**
     * Get total number of holes
     */
    getTotalHoles() {
        return this.totalHoles;
    }
    
    /**
     * Get the tee position for the current hole
     * @returns {THREE.Vector3} The tee position
     */
    getTeePosition() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holes.length) {
            return new THREE.Vector3(0, 0, 0);
        }
        return this.holes[this.currentHoleIndex].startPosition.clone();
    }
    
    /**
     * Update loop for the course. Called every frame.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Any per-frame updates for the course can go here
    }
    
    /**
     * Clean up all resources
     */
    cleanup() {
        // Remove all objects from scene
        this.courseObjects.forEach(object => {
            if (object && this.scene) {
                this.scene.remove(object);
            }
        });
        
        // Remove all physics bodies
        this.physicsBodies.forEach(body => {
            if (body && this.physicsWorld) {
                this.physicsWorld.removeBody(body);
            }
        });
        
        // Clear all arrays
        this.courseObjects = [];
        this.physicsBodies = [];
        this.holes = [];
        this.holeBodies = [];
        this.obstacles = [];
        this.obstacleBodies = [];
        
        // Call parent cleanup if exists
        if (super.cleanup) {
            super.cleanup();
        }
    }
    
    /**
     * Get the current hole configuration
     * @returns {Object} The current hole configuration object
     */
    getCurrentHole() {
        if (this.currentHoleIndex < 0 || this.currentHoleIndex >= this.holes.length) {
            return null;
        }
        return {
            mesh: this.holes[this.currentHoleIndex].mesh,
            startPosition: this.holes[this.currentHoleIndex].startPosition.clone(),
            holePosition: this.holes[this.currentHoleIndex].holePosition.clone(),
            par: this.holes[this.currentHoleIndex].par
        };
    }
    
    /**
     * Get the next hole configuration
     * @returns {Object} The next hole configuration object or null if no next hole
     */
    getNextHole() {
        if (!this.hasNextHole()) {
            return null;
        }
        return {
            mesh: this.holes[this.currentHoleIndex + 1].mesh,
            startPosition: this.holes[this.currentHoleIndex + 1].startPosition.clone(),
            holePosition: this.holes[this.currentHoleIndex + 1].holePosition.clone(),
            par: this.holes[this.currentHoleIndex + 1].par
        };
    }
} 