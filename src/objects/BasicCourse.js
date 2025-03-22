import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Course } from './Course';

/**
 * BasicCourse - A single-hole mini golf course in space
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
        
        // Single hole configuration
        this.holePosition = new THREE.Vector3(0, 0, -8);
        this.flag = null;
        this.flagOrigVertices = null;
        this.holePositions = new Map();
        
        // Now that everything is initialized, create the course
        this.createCourse();
    }
    
    /**
     * Override createCourse to build a single-hole course
     */
    createCourse() {
        // Create base ground first
        this.createGround();
        
        // Create the actual hole
        this.createHole();
    }
    
    /**
     * Create the overall ground plane
     */
    createGround() {
        // Create a space-like background with a visible ground
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111133, // Dark blue for space-like background
            roughness: 0.9,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        this.ground.position.y = -0.05; // Set below the fairway
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        this.courseObjects.push(this.ground);
        
        // Set the scene background color to dark space
        this.scene.background = new THREE.Color(0x000011);
        
        // Create ground physics body
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
     * Create a single hole with all its elements
     */
    createHole() {
        // Define hole and start positions
        const holePosition = this.holePosition;
        const startPosition = this.startPositions[0];
        
        // Store the hole info
        this.holePositions.set(0, { position: holePosition.clone() });
        
        // Create the fairway
        this.createFairway(holePosition, startPosition);
        
        // Create the hole elements
        this.createHoleGeometry(holePosition);
        
        // Create the hole enclosure
        this.createHoleEnclosure(holePosition, startPosition);
        
        // Create start marker
        this.createStartMarker(startPosition);
    }
    
    /**
     * Create a fairway (visual path between start and hole)
     * @param {THREE.Vector3} holePosition - Position of the hole
     * @param {THREE.Vector3} startPosition - Position of the tee
     */
    createFairway(holePosition, startPosition) {
        const fairwayWidth = 4;
        const fairwayLength = 16; // Distance between start and hole
        
        // Calculate the midpoint between start and hole positions
        const fairwayPosition = new THREE.Vector3()
            .addVectors(holePosition, startPosition)
            .multiplyScalar(0.5);
        fairwayPosition.y = 0; // Ensure it's at ground level
        
        // Create fairway geometry
        const fairwayGeometry = new THREE.BoxGeometry(fairwayWidth, 0.1, fairwayLength);
        const fairwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x88AA55, // Light green for fairway
            roughness: 0.6,
            metalness: 0.1
        });
        
        const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
        fairway.position.copy(fairwayPosition);
        fairway.receiveShadow = true;
        this.scene.add(fairway);
        this.courseObjects.push(fairway);
    }
    
    /**
     * Create the hole geometry and physics
     * @param {THREE.Vector3} position - Position for the hole
     */
    createHoleGeometry(position) {
        // Ball radius is 0.2, so hole radius should be about 0.35
        const holeRadius = 0.35;
        const holeDepth = 0.3;
        
        // Create the hole bottom (black circle at bottom of hole)
        const holeBottomGeometry = new THREE.CircleGeometry(holeRadius, 32);
        const holeBottomMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide
        });
        
        const holeBottom = new THREE.Mesh(holeBottomGeometry, holeBottomMaterial);
        holeBottom.rotation.x = -Math.PI / 2;
        holeBottom.position.set(position.x, position.y - holeDepth + 0.005, position.z);
        this.scene.add(holeBottom);
        this.holes.push(holeBottom);
        this.courseObjects.push(holeBottom);
        
        // Create hole walls
        const holeWallGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
        const holeWallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.BackSide
        });
        
        const holeWall = new THREE.Mesh(holeWallGeometry, holeWallMaterial);
        holeWall.position.set(position.x, position.y - holeDepth/2, position.z);
        this.scene.add(holeWall);
        this.holes.push(holeWall);
        this.courseObjects.push(holeWall);
        
        // Create a visible rim around the hole
        const rimRadius = holeRadius + 0.1;
        const rimGeometry = new THREE.RingGeometry(holeRadius, rimRadius, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0xAAAAAA,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(position.x, position.y + 0.01, position.z);
        rim.receiveShadow = true;
        this.scene.add(rim);
        this.holes.push(rim);
        this.courseObjects.push(rim);
        
        // Create the hole (inner circle)
        const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
        const holeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide
        });
        
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(position.x, position.y + 0.008, position.z);
        this.scene.add(hole);
        this.holes.push(hole);
        this.courseObjects.push(hole);
        
        // Create physics for the hole
        if (this.physicsWorld) {
            // Create a funnel effect
            const funnelRadius = rimRadius * 1.5;
            const funnelShape = new CANNON.Cylinder(funnelRadius, holeRadius, 0.15, 16);
            const funnelBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position.x, position.y - 0.05, position.z),
                shape: funnelShape,
                material: this.physicsWorld.groundMaterial
            });
            
            funnelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            this.physicsWorld.addBody(funnelBody);
            this.physicsBodies.push(funnelBody);
            
            // Create a hole trigger
            const holeTriggerBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position.x, position.y - 0.1, position.z),
                shape: new CANNON.Cylinder(holeRadius * 0.9, holeRadius * 0.9, 0.2, 16),
                material: this.physicsWorld.defaultMaterial,
                collisionResponse: false
            });
            
            holeTriggerBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            holeTriggerBody.isTrigger = true;
            holeTriggerBody.collisionFilterGroup = 2; // Holes
            holeTriggerBody.collisionFilterMask = 4;  // Collide with ball
            holeTriggerBody.userData = { type: 'hole' };
            
            this.holeBodies.push(holeTriggerBody);
            this.physicsWorld.addBody(holeTriggerBody);
            this.physicsBodies.push(holeTriggerBody);
            
            // Create the hole depression
            const holePhysicsBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position.x, position.y - 0.15, position.z),
                material: this.physicsWorld.defaultMaterial
            });
            
            const holePlaneShape = new CANNON.Plane();
            holePhysicsBody.addShape(holePlaneShape);
            holePhysicsBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            
            this.physicsWorld.addBody(holePhysicsBody);
            this.physicsBodies.push(holePhysicsBody);
        }
        
        // Create the flag
        this.createFlag(position);
        
        // Store the hole position with more details
        const holeInfo = {
            position: position.clone(),
            radius: holeRadius,
            body: this.holeBodies.length > 0 ? this.holeBodies[this.holeBodies.length - 1] : null
        };
        
        // Update the hole positions map
        this.holePositions.set(0, holeInfo);
    }
    
    /**
     * Create a flag for the hole
     * @param {THREE.Vector3} position - Position for the flag
     */
    createFlag(position) {
        const flagHeight = 1.8;
        
        // Create flagpole
        const flagpoleGeometry = new THREE.CylinderGeometry(0.03, 0.03, flagHeight, 8);
        const flagpoleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE0E0E0,
            roughness: 0.4,
            metalness: 0.6,
            emissive: 0xAAAAAA,
            emissiveIntensity: 0.4
        });
        
        const flagpole = new THREE.Mesh(flagpoleGeometry, flagpoleMaterial);
        flagpole.position.set(position.x, position.y + flagHeight/2, position.z);
        this.scene.add(flagpole);
        this.courseObjects.push(flagpole);
        
        // Create flag
        const flagWidth = 0.6;
        const flagHeight2 = 0.4;
        const flagSegments = 10;
        const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight2, flagSegments, 1);
        
        // Create wave effect
        const vertices = flagGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const waveAmount = (x / flagWidth) * 0.1;
            vertices[i+1] += Math.sin(x * 5) * waveAmount;
        }
        
        const flagMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.7,
            side: THREE.DoubleSide
        });
        
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(position.x + 0.3, position.y + flagHeight - 0.2, position.z);
        flag.rotation.y = Math.PI / 2;
        this.scene.add(flag);
        this.courseObjects.push(flag);
        
        // Store flag for animation
        this.flag = flag;
        this.flagOrigVertices = [...vertices];
        
        // Add light at the flag
        const flagLight = new THREE.PointLight(0xFFFFFF, 1.2, 12);
        flagLight.position.set(position.x, position.y + flagHeight - 0.1, position.z);
        this.scene.add(flagLight);
        this.courseObjects.push(flagLight);
    }
    
    /**
     * Create enclosure walls for the hole
     * @param {THREE.Vector3} holePosition - Position of the hole
     * @param {THREE.Vector3} startPosition - Position of the tee
     */
    createHoleEnclosure(holePosition, startPosition) {
        const width = 4; // Fairway width
        
        const wallHeight = 1.0;
        const wallThickness = 0.5;
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D, // Brown
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0x3A1F00,
            emissiveIntensity: 0.3
        });
        
        // Calculate distance between hole and start
        const length = Math.abs(holePosition.z - startPosition.z) + 2;
        
        // Calculate positions for walls
        const centerZ = (holePosition.z + startPosition.z) / 2;
        const halfWidth = width / 2 + wallThickness / 2;
        
        // Define walls
        const walls = [
            // Left wall
            { 
                size: [wallThickness, wallHeight, length], 
                position: [holePosition.x - halfWidth, wallHeight/2, centerZ] 
            },
            // Right wall
            { 
                size: [wallThickness, wallHeight, length], 
                position: [holePosition.x + halfWidth, wallHeight/2, centerZ] 
            },
            // Back wall (behind hole)
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, holePosition.z - 1] 
            },
            // Front wall (behind tee)
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, startPosition.z + 1] 
            }
        ];
        
        // Create each wall
        walls.forEach(wall => {
            // Create mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
            this.courseObjects.push(mesh);
            
            // Create physics body
            if (this.physicsWorld) {
                const body = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(...wall.position),
                    shape: new CANNON.Box(new CANNON.Vec3(wall.size[0]/2, wall.size[1]/2, wall.size[2]/2)),
                    material: this.physicsWorld.bumperMaterial
                });
                
                this.physicsWorld.addBody(body);
                this.obstacleBodies.push(body);
                this.physicsBodies.push(body);
            }
        });
        
        // Add floor beneath the hole
        const floorWidth = width + wallThickness*2;
        const floorLength = length;
        const floorGeometry = new THREE.BoxGeometry(floorWidth, 0.1, floorLength);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x222244, // Dark blue floor
            roughness: 0.8,
            metalness: 0.1,
            opacity: 1.0
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(holePosition.x, -0.05, centerZ);
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.courseObjects.push(floor);
        
        // Create floor physics body
        if (this.physicsWorld) {
            const floorBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(holePosition.x, -0.05, centerZ),
                shape: new CANNON.Box(new CANNON.Vec3(floorWidth/2, 0.05, floorLength/2)),
                material: this.physicsWorld.groundMaterial
            });
            
            this.physicsWorld.addBody(floorBody);
            this.physicsBodies.push(floorBody);
        }
    }
    
    /**
     * Create a visual marker for the starting position
     * @param {THREE.Vector3} position - Position for the start marker
     */
    createStartMarker(position) {
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
        this.scene.add(teeDot);
        this.courseObjects.push(teeDot);
    }
    
    /**
     * Load a specific hole - for backward compatibility
     */
    loadHole(holeNumber = 1) {
        // Only support the one hole
        console.log('Loading hole 1 (only hole available)');
        
        // Update golf ball target position
        if (this.game && this.game.ball) {
            if (this.game.ball.currentHolePosition !== undefined) {
                this.game.ball.currentHolePosition = this.holePosition;
                this.game.ball.currentHoleIndex = 0;
            }
        }
        
        return true;
    }
    
    /**
     * Get current hole par (always 3 for this simple course)
     */
    getCurrentHolePar() {
        return 3;
    }
    
    /**
     * Get par for the current hole
     * @returns {number} Par value for current hole
     */
    getHolePar() {
        return this.getCurrentHolePar();
    }
    
    /**
     * Get the start position for the hole
     */
    getHoleStartPosition() {
        return this.startPositions[0];
    }
    
    /**
     * Get the hole position
     */
    getHolePosition() {
        // Either return from the stored Map or from the instance property
        if (this.holePositions && this.holePositions.has(0)) {
            const holeInfo = this.holePositions.get(0);
            return holeInfo.position;
        }
        return this.holePosition;
    }
    
    /**
     * Get the tee (starting) position for the current hole
     * @returns {THREE.Vector3} Starting position
     */
    getTeePosition() {
        // Return the start position of the current hole
        return this.startPositions[0].clone();
    }
    
    /**
     * Update the course animations
     */
    update() {
        // Animate the flag if it exists
        if (this.flag && this.flagOrigVertices) {
            const vertices = this.flag.geometry.attributes.position.array;
            const origVerts = this.flagOrigVertices;
            
            if (origVerts && origVerts.length === vertices.length) {
                const time = Date.now() * 0.003;
                
                // Update vertices for wave effect
                for (let i = 0; i < vertices.length; i += 3) {
                    const x = origVerts[i];
                    const waveStrength = (x / 0.6) * 0.15;
                    
                    vertices[i+1] = origVerts[i+1] + Math.sin(time * 2 + x * 10) * waveStrength;
                    vertices[i+2] = origVerts[i+2] + Math.cos(time + x * 5) * waveStrength * 0.5;
                }
                
                this.flag.geometry.attributes.position.needsUpdate = true;
            }
        }
        
        // Call parent update if it exists
        if (super.update) {
            super.update();
        }
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