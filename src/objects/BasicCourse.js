import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Course } from './Course';

/**
 * BasicCourse - A mini golf course in space with support for multiple holes
 */
export class BasicCourse extends Course {
    /**
     * Create a new BasicCourse instance
     * @param {THREE.Scene} scene - The scene to add course elements to
     * @param {object} physicsWorld - The physics world to add physics bodies to
     * @param {object} game - Reference to the main game object
     */
    constructor(scene, physicsWorld, game = null) {
        // Call the parent constructor with autoCreate:false to prevent premature initialization
        super(scene, physicsWorld, { 
            game: game,
            startPosition: new THREE.Vector3(0, 0.2, 8),
            autoCreate: false
        });
        
        // Store reference to game
        this.game = game;
        
        // Initialize tracking arrays
        this.courseObjects = [];
        this.physicsBodies = [];
        
        // Multi-hole configuration
        this.currentHoleIndex = 0;
        this.totalHoles = 2; // Initially supporting 2 holes
        
        // Define hole configurations
        this.holes = [
            // Hole 1 (original position)
            {
                holePosition: new THREE.Vector3(0, 0, -8),
                startPosition: new THREE.Vector3(0, 0.2, 8),
                courseWidth: 4,
                courseLength: 20,
                par: 3
            },
            // Hole 2 (positioned directly below Hole 1)
            {
                holePosition: new THREE.Vector3(0, -40, -8), // Keep same X,Z, just change Y to be directly below
                startPosition: new THREE.Vector3(0, -39.8, 8), // Keep same X,Z as hole 1
                courseWidth: 4,
                courseLength: 20,
                par: 3
            }
        ];
        
        // Backward compatibility - single hole position reference
        this.holePosition = this.holes[0].holePosition;
        this.holePositions = new Map();
        
        // Now that everything is initialized, create the course
        this.createCourse();
    }
    
    /**
     * Override createCourse to build a multi-hole course
     */
    createCourse() {
        // Create base ground (space background)
        this.createBackground();
        
        // Create all holes in the course
        for (let i = 0; i < this.totalHoles; i++) {
            this.createHole(i);
        }
        
        // Load the first hole by default
        this.loadHole(0);
    }
    
    /**
     * Create a single hole with all its components
     * @param {number} holeIndex - Index of the hole to create
     */
    createHole(holeIndex) {
        const holeConfig = this.holes[holeIndex];
        
        console.log(`%c[COURSE DEBUG] Creating hole ${holeIndex + 1}`, 'background:#222; color:#ff9900', holeConfig);
        
        // Calculate the center position for the course
        const centerPosition = new THREE.Vector3()
            .addVectors(holeConfig.holePosition, holeConfig.startPosition)
            .multiplyScalar(0.5);
        centerPosition.y = 0; // Ensure it's at ground level
        
        // Create the unified green surface
        this.createGreenSurface(centerPosition, holeConfig.courseWidth, holeConfig.courseLength, holeConfig.holePosition, holeIndex);
        
        // Create the walls/boundaries
        this.createCourseBoundaries(centerPosition, holeConfig.courseWidth, holeConfig.courseLength, 1.0, 0.5, holeIndex);
        
        // Create the hole
        this.createHoleGeometry(holeConfig.holePosition, holeIndex);
        
        // Create the start marker (tee)
        this.createStartMarker(holeConfig.startPosition, holeIndex);
        
        // Store the hole info for backward compatibility
        this.holePositions.set(holeIndex, { position: holeConfig.holePosition.clone() });
        
        console.log(`%c[COURSE DEBUG] Hole ${holeIndex + 1} creation complete`, 'background:#222; color:#ff9900');
    }
    
    /**
     * Load a specific hole and make it active
     * @param {number} holeIndex - Index of the hole to load
     */
    loadHole(holeIndex) {
        if (holeIndex < 0 || holeIndex >= this.totalHoles) {
            console.error(`[COURSE ERROR] Invalid hole index: ${holeIndex}`);
            return;
        }
        
        console.log(`%c[COURSE DEBUG] Loading hole ${holeIndex + 1}`, 'background:#222; color:#ff9900');
        
        // Update current hole index
        this.currentHoleIndex = holeIndex;
        
        // Update the holePosition reference for backward compatibility
        this.holePosition = this.holes[holeIndex].holePosition;
        
        // Loop through all course objects and set visibility
        for (let i = 0; i < this.courseObjects.length; i++) {
            const obj = this.courseObjects[i];
            if (obj.userData && obj.userData.holeIndex !== undefined) {
                // Handle different object types
                if (obj.geometry instanceof THREE.ExtrudeGeometry) {
                    // Green surfaces - keep both visible
                    obj.visible = true;
                } else if (obj.geometry instanceof THREE.RingGeometry) {
                    // Hole rims - keep both visible
                    obj.visible = true;
                } else if (obj.geometry instanceof THREE.CylinderGeometry) {
                    // Tee markers and hole number indicators
                    obj.visible = (obj.userData.holeIndex === holeIndex);
                } else {
                    // Walls and other objects
                    obj.visible = (obj.userData.holeIndex === holeIndex);
                }
            }
        }
        
        console.log(`%c[COURSE DEBUG] Hole ${holeIndex + 1} loaded successfully`, 'background:#222; color:#ff9900');
    }
    
    /**
     * Move to the next hole
     * @returns {boolean} Whether the move was successful
     */
    nextHole() {
        const nextIndex = this.currentHoleIndex + 1;
        if (nextIndex < this.totalHoles) {
            this.loadHole(nextIndex);
            return true;
        }
        return false;
    }
    
    /**
     * Create the space background
     */
    createBackground() {
        // Set the scene background color to dark space
        this.scene.background = new THREE.Color(0x000011);
        
        // Create ground physics body (invisible)
        if (this.physicsWorld) {
            this.groundBody = this.physicsWorld.createGroundBody(this.physicsWorld.groundMaterial);
            this.physicsWorld.addBody(this.groundBody);
            this.physicsBodies.push(this.groundBody);
            
            // Add safety floor to catch any fall-through
            const safetyFloorBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(0, -1, 0),
                shape: new CANNON.Plane(),
                material: this.physicsWorld.groundMaterial
            });
            safetyFloorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
            this.physicsWorld.addBody(safetyFloorBody);
            this.physicsBodies.push(safetyFloorBody);
        }
    }
    
    /**
     * Create the unified green surface for the course
     * @param {THREE.Vector3} centerPosition - Center position of the course
     * @param {number} width - Width of the course
     * @param {number} length - Length of the course
     * @param {THREE.Vector3} holePosition - Position of the hole
     * @param {number} holeIndex - Index of the hole this surface belongs to
     */
    createGreenSurface(centerPosition, width, length, holePosition, holeIndex) {
        // Debug logging
        console.log(`%c[GREEN DEBUG] Creating green surface for hole ${holeIndex + 1}:`, 'background:#222; color:#2DCB2D', {
            centerPosition: centerPosition.clone(),
            width,
            length,
            holePosition: holePosition.clone()
        });
        
        // Create a shape with a hole in it
        const holeRadius = 0.5;
        const shape = new THREE.Shape();
        
        // Calculate corners relative to center
        const halfWidth = width / 2;
        const halfLength = length / 2;
        
        // Convert hole position to be relative to center position
        const relativeHoleX = holePosition.x - centerPosition.x;
        const relativeHoleZ = holePosition.z - centerPosition.z;
        
        // Draw the outer rectangle
        shape.moveTo(-halfWidth, -halfLength);
        shape.lineTo(halfWidth, -halfLength);
        shape.lineTo(halfWidth, halfLength);
        shape.lineTo(-halfWidth, halfLength);
        shape.lineTo(-halfWidth, -halfLength);
        
        // Create a hole
        const holePath = new THREE.Path();
        holePath.absarc(relativeHoleX, relativeHoleZ, holeRadius, 0, Math.PI * 2, true);
        shape.holes.push(holePath);
        
        // Create geometry from the shape
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.1,
            bevelEnabled: false
        });
        
        // Rotate the geometry to lay flat
        geometry.rotateX(Math.PI / 2);
        
        // Create the green material
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2DCB2D, // Bright green for better contrast
            roughness: 0.5,
            metalness: 0.1,
            emissive: 0x006400,
            emissiveIntensity: 0.1,
            side: THREE.DoubleSide
        });
        
        // Create the mesh
        const greenSurface = new THREE.Mesh(geometry, greenMaterial);
        greenSurface.position.copy(centerPosition);
        
        // Set the correct Y position with significant difference between holes
        const surfaceY = holeIndex === 0 ? 0.01 : -39.99; // Match the hole position at -40
        greenSurface.position.y = surfaceY;
        
        greenSurface.receiveShadow = true;
        greenSurface.userData = { holeIndex: holeIndex };

        // Add to scene and tracking array
        this.scene.add(greenSurface);
        this.courseObjects.push(greenSurface);

        // Create physics for the green surface
        if (this.physicsWorld) {
            // Create physics bodies for each section of the green
            const thickness = 0.05; // Thickness of the physics bodies
            
            // Calculate distances from hole to edges
            const distToFront = Math.abs(holePosition.z - (centerPosition.z + halfLength));
            const distToBack = Math.abs(holePosition.z - (centerPosition.z - halfLength));
            const distToLeft = Math.abs(holePosition.x - (centerPosition.x - halfWidth));
            const distToRight = Math.abs(holePosition.x - (centerPosition.x + halfWidth));

            // Create bodies for the four sections around the hole
            const bodies = [
                // Front section
                {
                    size: new CANNON.Vec3(width/2, thickness, distToFront - holeRadius - 0.1),
                    position: new CANNON.Vec3(centerPosition.x, surfaceY, holePosition.z + (distToFront - holeRadius - 0.1)/2)
                },
                // Back section
                {
                    size: new CANNON.Vec3(width/2, thickness, distToBack - holeRadius - 0.1),
                    position: new CANNON.Vec3(centerPosition.x, surfaceY, holePosition.z - (distToBack - holeRadius - 0.1)/2)
                },
                // Left section
                {
                    size: new CANNON.Vec3(distToLeft - holeRadius - 0.1, thickness, length/2),
                    position: new CANNON.Vec3(holePosition.x - (distToLeft - holeRadius - 0.1)/2, surfaceY, centerPosition.z)
                },
                // Right section
                {
                    size: new CANNON.Vec3(distToRight - holeRadius - 0.1, thickness, length/2),
                    position: new CANNON.Vec3(holePosition.x + (distToRight - holeRadius - 0.1)/2, surfaceY, centerPosition.z)
                }
            ];

            bodies.forEach(bodyConfig => {
                const body = new CANNON.Body({
                    mass: 0,
                    position: bodyConfig.position,
                    shape: new CANNON.Box(bodyConfig.size),
                    material: this.physicsWorld.groundMaterial
                });
                body.userData = { holeIndex: holeIndex };
                this.physicsWorld.addBody(body);
                this.physicsBodies.push(body);
            });

            // Create a hole trigger for physics - position it just at the surface level
            const holeTrigger = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(holePosition.x, surfaceY - 0.01, holePosition.z),
                isTrigger: true,
                collisionResponse: false
            });
            
            // Use a cylinder shape for the hole - make it taller to ensure detection
            const holeShape = new CANNON.Cylinder(holeRadius * 1.1, holeRadius * 1.1, 1.0, 16);
            holeTrigger.addShape(holeShape);
            holeTrigger.collisionFilterGroup = 2;  // Group 2 for triggers
            holeTrigger.collisionFilterMask = 4;   // Collide with group 4 (ball)
            holeTrigger.userData = { type: 'hole', holeIndex: holeIndex };
            
            // Store in arrays
            this.physicsWorld.addBody(holeTrigger);
            this.physicsBodies.push(holeTrigger);
            
            // Add a vertical tunnel connecting first and second holes
            const tunnelHeight = 40; // Distance between first and second holes
            
            // Connect the tunnel from hole 1 to tee position of hole 2
            const hole2TeePosition = this.holes[1].startPosition.clone();
            
            // Create a vertical tunnel from hole 1 straight down
            const verticalTunnelTrigger = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(holePosition.x, surfaceY - tunnelHeight/4, holePosition.z),
                isTrigger: true,
                collisionResponse: false
            });
            
            const verticalTunnelShape = new CANNON.Cylinder(holeRadius * 1.5, holeRadius * 1.5, tunnelHeight/2, 16);
            verticalTunnelTrigger.addShape(verticalTunnelShape);
            verticalTunnelTrigger.collisionFilterGroup = 2;  // Group 2 for triggers
            verticalTunnelTrigger.collisionFilterMask = 4;   // Collide with group 4 (ball)
            verticalTunnelTrigger.userData = { type: 'tunnel', holeIndex: holeIndex };
            
            this.physicsWorld.addBody(verticalTunnelTrigger);
            this.physicsBodies.push(verticalTunnelTrigger);
            
            // Create a large landing pad at the tee position of hole 2
            const landingPadTrigger = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(hole2TeePosition.x, hole2TeePosition.y - 0.2, hole2TeePosition.z),
                isTrigger: true,
                collisionResponse: false
            });
            
            const landingPadShape = new CANNON.Cylinder(holeRadius * 3, holeRadius * 3, 0.5, 16);
            landingPadTrigger.addShape(landingPadShape);
            landingPadTrigger.collisionFilterGroup = 2;  // Group 2 for triggers
            landingPadTrigger.collisionFilterMask = 4;   // Collide with group 4 (ball)
            landingPadTrigger.userData = { type: 'landing_pad', holeIndex: 1 }; // Point to hole 2
            
            this.physicsWorld.addBody(landingPadTrigger);
            this.physicsBodies.push(landingPadTrigger);
            
            // Make sure we have a holeBodies array
            if (!this.holeBodies) {
                this.holeBodies = [];
            }
            this.holeBodies.push(holeTrigger);
            
            // Add a debug message
            console.log(`%c[HOLE DEBUG] Created hole trigger at position: ${holeTrigger.position.x}, ${holeTrigger.position.y}, ${holeTrigger.position.z}`, 'background:#222; color:#FF00FF');
        }
    }
    
    /**
     * Create the boundaries/walls for the course
     * @param {THREE.Vector3} centerPosition - Center position of the course
     * @param {number} width - Width of the course
     * @param {number} length - Length of the course
     * @param {number} wallHeight - Height of the walls
     * @param {number} wallThickness - Thickness of the walls
     * @param {number} holeIndex - Index of the hole these boundaries belong to
     */
    createCourseBoundaries(centerPosition, width, length, wallHeight, wallThickness, holeIndex) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D, // Brown
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0x3A1F00,
            emissiveIntensity: 0.3
        });
        
        // Calculate half dimensions
        const halfWidth = width / 2 + wallThickness / 2;
        
        // Calculate tee and hole positions relative to center
        const holePosition = this.holes[holeIndex].holePosition;
        const startPosition = this.holes[holeIndex].startPosition;
        
        // Calculate the actual width needed for horizontal walls to be flush with vertical walls
        const horizontalWallWidth = width + wallThickness * 2;
        
        // Calculate the wall positions
        const backWallZ = holePosition.z - 1.5;
        const frontWallZ = startPosition.z + 1.5;
        
        // Calculate the side wall length to exactly match the distance between front and back walls
        const sideWallLength = Math.abs(frontWallZ - backWallZ) + wallThickness;
        
        // Calculate the center position for side walls
        const sideWallCenterZ = (frontWallZ + backWallZ) / 2;
        
        // Define walls - ensure side walls extend fully to connect with back and front walls
        const walls = [
            // Left wall - extend to exactly match front and back wall positions
            { 
                size: [wallThickness, wallHeight, sideWallLength], 
                position: [centerPosition.x - halfWidth, wallHeight/2, sideWallCenterZ] 
            },
            // Right wall - extend to exactly match front and back wall positions
            { 
                size: [wallThickness, wallHeight, sideWallLength], 
                position: [centerPosition.x + halfWidth, wallHeight/2, sideWallCenterZ] 
            },
            // Back wall (behind hole) - moved back by 1.5 units
            { 
                size: [horizontalWallWidth, wallHeight, wallThickness], 
                position: [centerPosition.x, wallHeight/2, backWallZ] 
            },
            // Front wall (behind tee) - moved back by 1.5 units
            { 
                size: [horizontalWallWidth, wallHeight, wallThickness], 
                position: [centerPosition.x, wallHeight/2, frontWallZ] 
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
            
            // Initially hide this wall if it's not the current hole
            if (holeIndex !== this.currentHoleIndex) {
                wallMesh.visible = false;
            }
            
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
     * @param {THREE.Vector3} position - Position of the hole
     * @param {number} holeIndex - Index of the hole this geometry belongs to
     */
    createHoleGeometry(position, holeIndex) {
        // Create the hole mesh
        const holeRadius = 0.35;
        const holeDepth = 0.3;
        
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
        rim.position.set(position.x, position.y + 0.005, position.z); // Use hole's Y position + small offset
        rim.userData = { holeIndex: holeIndex };
        
        this.scene.add(rim);
        this.courseObjects.push(rim);
        
        // Create hole body (for collision detection)
        if (this.physicsWorld) {
            // Create a new body for the hole
            const holeBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position.x, position.y + 0.001, position.z), // Use hole's Y position
                type: CANNON.Body.STATIC,
                collisionResponse: false, // Don't affect ball motion
                isTrigger: true // Acts as a trigger
            });
            
            // Add a cylinder shape for the hole
            const holeShape = new CANNON.Cylinder(holeRadius, holeRadius, 0.1, 16);
            holeBody.addShape(holeShape);
            
            // Make holes only trigger the ball and not affect its motion
            holeBody.collisionFilterGroup = 2; // Assign to group 2
            holeBody.collisionFilterMask = 4; // Only collide with the ball (group 4)
            
            // Tag the body for easy identification and store hole index
            holeBody.userData = { type: 'hole', holeIndex: holeIndex };
            
            this.physicsWorld.addBody(holeBody);
            this.physicsBodies.push(holeBody);
            this.holeBodies.push(holeBody);
        }
    }
    
    /**
     * Create a visual marker for the starting position
     * @param {THREE.Vector3} position - Position for the start marker
     * @param {number} holeIndex - Index of the hole this marker belongs to
     */
    createStartMarker(position, holeIndex) {
        // Create base
        const teeBaseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeBaseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0077cc,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const teeBase = new THREE.Mesh(teeBaseGeometry, teeBaseMaterial);
        teeBase.position.set(position.x, 0.03, position.z);
        teeBase.receiveShadow = true;
        teeBase.userData = { holeIndex: holeIndex };
        
        this.scene.add(teeBase);
        this.courseObjects.push(teeBase);
        
        // Create dot for ball placement
        const teeDotGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24);
        const teeDotMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.3
        });
        
        const teeDot = new THREE.Mesh(teeDotGeometry, teeDotMaterial);
        teeDot.position.set(position.x, 0.04, position.z);
        teeDot.receiveShadow = true;
        teeDot.userData = { holeIndex: holeIndex };
        
        this.scene.add(teeDot);
        this.courseObjects.push(teeDot);
        
        // Initially hide this marker if it's not the current hole
        if (holeIndex !== this.currentHoleIndex) {
            teeBase.visible = false;
            teeDot.visible = false;
        }
    }
    
    /**
     * Get current hole par
     * @returns {number} Par value for current hole
     */
    getCurrentHolePar() {
        return this.holes[this.currentHoleIndex].par;
    }
    
    /**
     * Get par for the current hole
     * @returns {number} Par value for current hole
     */
    getHolePar() {
        return this.getCurrentHolePar();
    }
    
    /**
     * Get the start position for the current hole
     * @returns {THREE.Vector3} Starting position for current hole
     */
    getHoleStartPosition() {
        return this.holes[this.currentHoleIndex].startPosition.clone();
    }
    
    /**
     * Get the position of the hole for the current hole
     * @returns {THREE.Vector3} Hole position for current hole
     */
    getHolePosition() {
        return this.holes[this.currentHoleIndex].holePosition.clone();
    }
    
    /**
     * Get the tee (starting) position for the current hole
     * @returns {THREE.Vector3} Starting position
     */
    getTeePosition() {
        // Return the start position of the current hole
        return this.holes[this.currentHoleIndex].startPosition.clone();
    }
    
    /**
     * Get the total number of holes in the course
     * @returns {number} Total number of holes
     */
    getTotalHoles() {
        return this.totalHoles;
    }
    
    /**
     * Get the current hole number (1-indexed)
     * @returns {number} Current hole number
     */
    getCurrentHoleNumber() {
        return this.currentHoleIndex + 1;
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
} 