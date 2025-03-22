import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Course } from './Course';

/**
 * BasicCourse - A single-hole mini golf course in space
 * 
 * Hole:
 * 1. Simple straight path in a space environment
 */
export class BasicCourse extends Course {
    constructor(scene, physicsWorld) {
        super(scene, physicsWorld);
        this.length = 1; // Total number of holes in this course (now only 1)
        this.currentHoleObjects = []; // Track meshes for current hole
        this.currentHolePhysicsBodies = []; // Track physics bodies for current hole
        
        this.courseLength = 1; // Only 1 hole
        this.currentHole = 1;
        this.fairways = [];
        this.holeObjects = new Map();
        this.holePositions = new Map(); // Store hole positions and info
        
        // Storage for hole specific objects
        this.currentHoleObjects = [];
        this.currentHolePhysicsBodies = [];
        
        // Storage for tracking created objects
        this.trackedMeshes = [];
        this.trackedBodies = [];
    }
    
    /**
     * Override createCourse to build only the shared elements
     */
    createCourse() {
        // Create base ground
        this.createGround();
        
        // Initialize hole start positions
        this.initializeHolePositions();
    }
    
    /**
     * Initialize all hole start positions without creating the geometry
     */
    initializeHolePositions() {
        // Only need position for one hole now
        this.startPositions[0] = new THREE.Vector3(0, 0.2, 0);
        
        console.log("Initialized default hole position - will be overridden");
    }
    
    /**
     * Load a specific hole by number
     */
    loadHole(holeNumber) {
        // Clear any existing hole
        this.clearHole();
        
        console.log(`Loading hole ${holeNumber}`);
        
        // Check if valid hole
        if (holeNumber !== 1) {
            console.error(`Invalid hole number: ${holeNumber}`);
            return false;
        }
        
        // Set current hole number
        this.currentHole = holeNumber;
        
        // Create hole 1
        this.createHole1();
        
        // If using GolfBall implementation, update the ball's target hole position
        if (this.game && this.game.ball) {
            const holePosition = this.getHolePosition(holeNumber);
            if (this.game.ball.currentHolePosition !== undefined) {
                this.game.ball.currentHolePosition = holePosition;
                this.game.ball.currentHoleIndex = holeNumber - 1; // Convert to 0-indexed
                console.log(`Set ball target hole position: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
            }
        }
        
        return true;
    }
    
    /**
     * Clear all objects and physics bodies for the current hole
     */
    clearHole() {
        // Remove meshes from scene
        this.currentHoleObjects.forEach(object => {
            if (object && this.scene) {
                this.scene.remove(object);
            }
        });
        
        // Remove physics bodies
        this.currentHolePhysicsBodies.forEach(body => {
            if (body && this.physicsWorld) {
                this.physicsWorld.removeBody(body);
            }
        });
        
        // Clear tracking arrays
        this.currentHoleObjects = [];
        this.currentHolePhysicsBodies = [];
        
        // Clear hole-specific collections from base class
        this.holes = [];
        this.holeBodies = [];
    }
    
    /**
     * Helper method to track objects and bodies for the current hole
     * @param {THREE.Object3D} object - Three.js object to track
     * @param {CANNON.Body} body - Cannon.js physics body to track (optional)
     */
    trackHoleObject(object, body = null) {
        if (object) {
            this.currentHoleObjects.push(object);
        }
        if (body) {
            this.currentHolePhysicsBodies.push(body);
        }
    }
    
    /**
     * Create the overall ground plane
     */
    createGround() {
        // Create a space-like background (completely black)
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, // Pure black for space-like background
            side: THREE.DoubleSide
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        this.ground.position.y = -0.05; // Set below the fairway
        
        if (this.scene) {
            this.scene.add(this.ground);
        }
        
        // Set the scene background color to match
        if (this.scene) {
            this.scene.background = new THREE.Color(0x000000);
        }
        
        // Create ground physics body with a large collision area to prevent falling
        if (this.physicsWorld) {
            this.groundBody = this.physicsWorld.createGroundBody(this.physicsWorld.groundMaterial);
            this.physicsWorld.addBody(this.groundBody);
            
            // Add an invisible safety floor below everything to catch any fall-through
            const safetyFloorBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(0, -1, 0), // Positioned well below the course
                shape: new CANNON.Plane(),
                material: this.physicsWorld.groundMaterial
            });
            safetyFloorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
            this.physicsWorld.addBody(safetyFloorBody);
        }
    }
    
    /**
     * Create boundaries around the entire course
     */
    createBoundaries() {
        // Create boundary dimensions - reduced from 100 to match smaller ground
        const width = 50;
        const height = 1;
        const depth = 50;
        const thickness = 1;
        
        // Create boundary materials
        const boundaryMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a381f, // Dark brown
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Create boundaries
        const boundaries = [
            // North boundary
            { size: [width, height, thickness], position: [0, height/2, -depth/2], rotation: [0, 0, 0] },
            // South boundary
            { size: [width, height, thickness], position: [0, height/2, depth/2], rotation: [0, 0, 0] },
            // East boundary
            { size: [thickness, height, depth], position: [width/2, height/2, 0], rotation: [0, 0, 0] },
            // West boundary
            { size: [thickness, height, depth], position: [-width/2, height/2, 0], rotation: [0, 0, 0] }
        ];
        
        // Create each boundary
        boundaries.forEach(boundary => {
            // Create mesh
            const geometry = new THREE.BoxGeometry(...boundary.size);
            const mesh = new THREE.Mesh(geometry, boundaryMaterial);
            mesh.position.set(...boundary.position);
            mesh.rotation.set(...boundary.rotation);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
            
            // Create physics body
            if (this.physicsWorld) {
                const body = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(...boundary.position),
                    shape: new CANNON.Box(new CANNON.Vec3(boundary.size[0]/2, boundary.size[1]/2, boundary.size[2]/2)),
                    material: this.physicsWorld.bumperMaterial
                });
                
                // Apply rotation if needed
                if (boundary.rotation[0] !== 0 || boundary.rotation[1] !== 0 || boundary.rotation[2] !== 0) {
                    body.quaternion.setFromEuler(
                        boundary.rotation[0],
                        boundary.rotation[1],
                        boundary.rotation[2]
                    );
                }
                
                this.physicsWorld.addBody(body);
                this.obstacleBodies.push(body);
            }
        });
    }
    
    /**
     * Create Hole 1: Simple straight path to validate basic putting mechanics
     */
    createHole1() {
        // Position for hole 1 - move hole away from origin to create distance from tee
        const holePosition = new THREE.Vector3(0, 0, -8); // Move hole to negative Z
        
        // Start position at positive Z (opposite end from hole)
        const startPosition = new THREE.Vector3(0, 0.2, 8);
        this.startPositions[0] = startPosition; // Override the stored position
        
        // Create a visual path to the hole with appropriate width
        const fairwayWidth = 4;
        const fairwayLength = 16; // Length between tee and hole
        const fairway = this.createFairway(startPosition, holePosition, fairwayWidth, fairwayLength);
        this.trackHoleObject(fairway);
        
        // Create a hole at the correct position
        const hole = this.createHoleAt(holePosition.x, holePosition.y, holePosition.z);
        
        // Create proper walls around the fairway
        this.createHoleEnclosure(holePosition, startPosition, fairwayWidth);
        
        // Create start marker
        const marker = this.createStartMarker(startPosition);
        this.trackHoleObject(marker);
    }
    
    /**
     * Create a proper enclosure for the hole with walls on both sides
     */
    createHoleEnclosure(holePosition, startPosition, width) {
        const wallHeight = 1.0; // Taller walls for better visibility
        const wallThickness = 0.5; // Thicker walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D, // Brown
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0x3A1F00,
            emissiveIntensity: 0.3
        });
        
        // Calculate distance between hole and start
        const length = Math.abs(holePosition.z - startPosition.z) + 2; // Add buffer
        
        // Calculate positions for walls - center between start and hole
        const centerZ = (holePosition.z + startPosition.z) / 2;
        const halfWidth = width / 2 + wallThickness / 2;
        
        // Create walls on both sides of the fairway
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
            this.trackHoleObject(mesh);
            
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
                this.trackHoleObject(null, body);
            }
        });
        
        // Add a floor beneath the entire hole to prevent falling
        const floorWidth = width + wallThickness*2;
        const floorLength = length;
        const floorGeometry = new THREE.BoxGeometry(floorWidth, 0.1, floorLength);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // Black to match space background
            transparent: true,
            opacity: 0.0 // Invisible
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(holePosition.x, -0.05, centerZ);
        this.scene.add(floor);
        this.trackHoleObject(floor);
        
        // Create floor physics body
        if (this.physicsWorld) {
            const floorBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(holePosition.x, -0.05, centerZ),
                shape: new CANNON.Box(new CANNON.Vec3(floorWidth/2, 0.05, floorLength/2)),
                material: this.physicsWorld.groundMaterial
            });
            
            this.physicsWorld.addBody(floorBody);
            this.trackHoleObject(null, floorBody);
        }
    }
    
    /**
     * Create a hole at the specified position
     * Modified to track created objects and return the hole object
     */
    createHoleAt(x, y, z) {
        // Ball radius is 0.2, so hole radius should be about 0.35 (1.75 × ball size)
        const holeRadius = 0.35;
        const holeDepth = 0.3;
        const position = new THREE.Vector3(x, y, z);
        
        // Create a black hole bottom (prevents seeing through to space)
        const holeBottomGeometry = new THREE.CircleGeometry(holeRadius, 32);
        const holeBottomMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, // Pure black for the hole bottom
            side: THREE.DoubleSide
        });
        
        const holeBottom = new THREE.Mesh(holeBottomGeometry, holeBottomMaterial);
        holeBottom.rotation.x = -Math.PI / 2;
        holeBottom.position.set(position.x, position.y - holeDepth + 0.005, position.z);
        this.scene.add(holeBottom);
        this.holes.push(holeBottom);
        this.trackHoleObject(holeBottom);
        
        // Create hole walls (to prevent seeing through to space)
        const holeWallGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
        const holeWallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, // Black walls
            side: THREE.BackSide
        });
        
        const holeWall = new THREE.Mesh(holeWallGeometry, holeWallMaterial);
        holeWall.position.set(position.x, position.y - holeDepth/2, position.z);
        this.scene.add(holeWall);
        this.holes.push(holeWall);
        this.trackHoleObject(holeWall);
        
        // Create a visible rim around the hole for better visibility
        const rimRadius = holeRadius + 0.1; // Larger rim for better visibility
        const rimGeometry = new THREE.RingGeometry(holeRadius, rimRadius, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF, // White for better visibility in space
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0xAAAAAA,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Make it flat on ground
        rim.position.set(position.x, position.y + 0.01, position.z); // Slightly above the ground
        rim.receiveShadow = true;
        this.scene.add(rim);
        this.holes.push(rim);
        this.trackHoleObject(rim);
        
        // Create the hole (inner circle)
        const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
        const holeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, // Pure black for the hole
            side: THREE.DoubleSide
        });
        
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(position.x, position.y + 0.008, position.z);
        this.scene.add(hole);
        this.holes.push(hole);
        this.trackHoleObject(hole);
        
        // Create invisible physics bodies to guide the ball into the hole
        if (this.physicsWorld) {
            // Create a funnel effect leading to the hole
            const funnelRadius = rimRadius * 1.5;
            const funnelShape = new CANNON.Cylinder(funnelRadius, holeRadius, 0.15, 16);
            const funnelBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(position.x, position.y - 0.05, position.z),
                shape: funnelShape,
                material: this.physicsWorld.groundMaterial
            });
            
            // Rotate to align with hole
            funnelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            
            this.physicsWorld.addBody(funnelBody);
            this.trackHoleObject(null, funnelBody);
            
            // Create a hole trigger to detect when ball is in hole
            const holeTriggerBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(position.x, position.y - 0.1, position.z),
                shape: new CANNON.Cylinder(holeRadius * 0.9, holeRadius * 0.9, 0.2, 16),
                material: this.physicsWorld.defaultMaterial,
                collisionResponse: false // Don't affect ball physics
            });
            
            // Rotate to align with hole
            holeTriggerBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            
            // Set as a trigger for detecting entry
            holeTriggerBody.isTrigger = true;
            
            // Set collision groups
            holeTriggerBody.collisionFilterGroup = 2; // Holes
            holeTriggerBody.collisionFilterMask = 4;  // Collide with ball
            
            // Add custom user data to identify this as a hole
            holeTriggerBody.userData = { type: 'hole', holeNumber: this.currentHole };
            
            this.holeBodies.push(holeTriggerBody);
            this.physicsWorld.addBody(holeTriggerBody);
            this.trackHoleObject(null, holeTriggerBody);
            
            // Create the actual hole depression (a physical depression where the ball can fall into)
            const holePhysicsBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(position.x, position.y - 0.15, position.z),
                material: this.physicsWorld.defaultMaterial
            });
            
            // Create a plane at the bottom of the hole
            const holePlaneShape = new CANNON.Plane();
            holePhysicsBody.addShape(holePlaneShape);
            holePhysicsBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            
            this.physicsWorld.addBody(holePhysicsBody);
            this.trackHoleObject(null, holePhysicsBody);
        }
        
        // Add a more prominent flag with light/glow effect
        const flagHeight = 1.8; // Taller flagpole
        const flagpoleGeometry = new THREE.CylinderGeometry(0.03, 0.03, flagHeight, 8);
        const flagpoleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE0E0E0, // Bright white pole
            roughness: 0.4,
            metalness: 0.6,
            emissive: 0xAAAAAA,
            emissiveIntensity: 0.4
        });
        const flagpole = new THREE.Mesh(flagpoleGeometry, flagpoleMaterial);
        
        // Position the flagpole
        flagpole.position.set(position.x, position.y + flagHeight/2, position.z);
        this.scene.add(flagpole);
        this.trackHoleObject(flagpole);
        
        // Add larger flag with waving animation
        const flagWidth = 0.6;
        const flagHeight2 = 0.4;
        const flagSegments = 10; // More segments for wave effect
        const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight2, flagSegments, 1);
        
        // Create vertices for waving effect (initial state)
        const vertices = flagGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            // Apply wave effect based on x position
            const waveAmount = (x / flagWidth) * 0.1;
            vertices[i+1] += Math.sin(x * 5) * waveAmount;
        }
        
        const flagMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000, // Bright red flag
            emissive: 0xFF0000,
            emissiveIntensity: 0.7,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        
        // Position the flag near the top of the pole, offset to one side
        flag.position.set(position.x + 0.3, position.y + flagHeight - 0.2, position.z);
        flag.rotation.y = Math.PI / 2;
        this.scene.add(flag);
        this.trackHoleObject(flag);
        
        // Store flag and its original vertices for animation
        this.flag = flag;
        this.flagOrigVertices = [...vertices];
        
        // Add a checkered pattern to the flag for better visibility
        const checkerSize = 0.1;
        const checkerGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight2);
        const checkerMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const checker = new THREE.Mesh(checkerGeometry, checkerMaterial);
        checker.position.set(0, 0, 0.001); // Slightly in front of the flag
        flag.add(checker);
        
        // Create checkered texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Draw checker pattern
        const squareSize = canvas.width / 4;
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 4; y++) {
                const isWhite = (x + y) % 2 === 0;
                context.fillStyle = isWhite ? 'white' : 'transparent';
                context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
            }
        }
        
        // Create texture from canvas and apply to checker material
        const texture = new THREE.CanvasTexture(canvas);
        checkerMaterial.map = texture;
        checkerMaterial.needsUpdate = true;
        
        // Add a stronger point light at the flag to highlight the hole area
        const flagLight = new THREE.PointLight(0xFFFFFF, 1.2, 12);
        flagLight.position.set(position.x, position.y + flagHeight - 0.1, position.z);
        this.scene.add(flagLight);
        this.trackHoleObject(flagLight);
        
        // Add small spotlight shining on flag for emphasis
        const flagSpotlight = new THREE.SpotLight(0xFFFFFF, 2, 10, Math.PI/6, 0.5, 2);
        flagSpotlight.position.set(position.x - 1, position.y + 5, position.z - 1);
        flagSpotlight.target = flag;
        this.scene.add(flagSpotlight);
        this.trackHoleObject(flagSpotlight);
        
        // Store the hole position for the game to use later
        const holeInfo = {
            position: position.clone(),
            radius: holeRadius,
            body: this.holeBodies[this.holeBodies.length - 1]
        };
        
        // Save to the game's hole positions map if one exists
        if (this.holePositions) {
            this.holePositions.set(this.currentHole, holeInfo);
        }
        
        return hole;
    }
    
    /**
     * Create a fairway (visual path between start and hole)
     */
    createFairway(startPos, endPos, width, length) {
        // Calculate direction vector between start and end
        const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        
        // Create outer border - brighter and with slight emissive quality for visibility in space
        const borderMaterial = new THREE.MeshStandardMaterial({
            color: 0x32CD32, // Lime green for better visibility
            roughness: 0.7,
            metalness: 0.2,
            emissive: 0x006400,
            emissiveIntensity: 0.3
        });
        
        // Border is slightly larger than fairway
        const borderWidth = width + 0.5;
        const borderLength = length + 0.5;
        const borderGeometry = new THREE.PlaneGeometry(borderWidth, borderLength);
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        
        // Create fairway path material - brighter green for visibility in space
        const fairwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x7CFC00, // Lawn green for better contrast
            roughness: 0.5,
            metalness: 0.1,
            emissive: 0x228B22,
            emissiveIntensity: 0.2
        });
        
        // Create a plane that follows the direction
        const fairwayGeometry = new THREE.PlaneGeometry(width, length);
        const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
        
        // Calculate midpoint between start and end for positioning
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        
        // Position border slightly below fairway
        border.position.copy(midPoint);
        border.position.y = 0.003; 
        
        // Position fairway just above border
        fairway.position.copy(midPoint);
        fairway.position.y = 0.005; 
        
        // Rotate both to point from start to end
        const angle = Math.atan2(direction.x, direction.z);
        border.rotation.set(-Math.PI/2, 0, angle);
        fairway.rotation.set(-Math.PI/2, 0, angle);
        
        // Add shadows
        border.receiveShadow = true;
        fairway.receiveShadow = true;
        
        // Add to scene
        this.scene.add(border);
        this.scene.add(fairway);
        this.trackHoleObject(border); // Track border for cleanup
        
        return fairway;
    }
    
    /**
     * Create decorative walls around a hole area
     */
    createDecorativeWalls(holePosition, width, length) {
        const wallHeight = 0.6; // Make walls slightly taller
        const wallThickness = 0.4; // Make walls slightly thicker
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Saddle brown
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Calculate positions for walls to properly enclose the fairway
        const halfWidth = width / 2 + wallThickness / 2;
        const halfLength = length / 2;
        
        // Create walls - fully enclosed with proper positioning
        const walls = [
            // Left wall - extend along entire length
            { 
                size: [wallThickness, wallHeight, length + wallThickness], 
                position: [holePosition.x - halfWidth, wallHeight/2, holePosition.z + halfLength/2] 
            },
            // Right wall - extend along entire length
            { 
                size: [wallThickness, wallHeight, length + wallThickness], 
                position: [holePosition.x + halfWidth, wallHeight/2, holePosition.z + halfLength/2] 
            },
            // Back wall - placed directly behind the hole
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, holePosition.z - 0.5] 
            },
            // Front-left wall segment (with gap in middle for tee)
            { 
                size: [(width + wallThickness - 2) / 2, wallHeight, wallThickness], 
                position: [holePosition.x - (width + wallThickness) / 4 - 0.5, wallHeight/2, holePosition.z + length] 
            },
            // Front-right wall segment (with gap in middle for tee)
            { 
                size: [(width + wallThickness - 2) / 2, wallHeight, wallThickness], 
                position: [holePosition.x + (width + wallThickness) / 4 + 0.5, wallHeight/2, holePosition.z + length] 
            }
        ];
        
        // Create each wall
        const wallObjects = [];
        walls.forEach(wall => {
            // Create mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
            
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
            }
            
            wallObjects.push(mesh);
        });
        
        return wallObjects;
    }
    
    /**
     * Create a sand trap obstacle
     */
    createSandTrap(x, y, z, width, depth) {
        // Create a sand trap material
        const sandMaterial = new THREE.MeshStandardMaterial({
            color: 0xE8C170, // Sand color
            roughness: 1.0,
            metalness: 0.0
        });
        
        // Create a slightly depressed area for the sand
        const sandGeometry = new THREE.BoxGeometry(width, 0.1, depth);
        const sand = new THREE.Mesh(sandGeometry, sandMaterial);
        sand.position.set(x, -0.05, z); // Slightly sunken
        this.scene.add(sand);
        
        // Create physics body with high friction
        if (this.physicsWorld) {
            const sandBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(x, -0.05, z),
                shape: new CANNON.Box(new CANNON.Vec3(width/2, 0.05, depth/2)),
                material: this.physicsWorld.sandMaterial
            });
            
            this.physicsWorld.addBody(sandBody);
            this.sandTrapBodies.push(sandBody);
            this.sandTraps.push(sand);
        }
        
        return { mesh: sand, body: sandBody };
    }
    
    /**
     * Create a barrier obstacle
     */
    createBarrier(x, y, z, width, height, depth) {
        // Create barrier material
        const barrierMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Saddle brown
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create barrier mesh
        const barrierGeometry = new THREE.BoxGeometry(width, height, depth);
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.position.set(x, y, z);
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        this.scene.add(barrier);
        this.obstacles.push(barrier);
        
        // Create physics body
        if (this.physicsWorld) {
            const barrierBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(x, y, z),
                shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2)),
                material: this.physicsWorld.bumperMaterial
            });
            
            this.physicsWorld.addBody(barrierBody);
            this.obstacleBodies.push(barrierBody);
        }
        
        return { mesh: barrier, body: barrierBody };
    }
    
    /**
     * Create a sloped section
     */
    createSlope(x, width, length, zStart, height) {
        // Create slope material
        const slopeMaterial = new THREE.MeshStandardMaterial({
            color: 0x3EB489, // Same as fairway
            roughness: 0.7,
            metalness: 0.0
        });
        
        // Create slope geometry
        const slopeGeometry = new THREE.PlaneGeometry(width, length, 20, 20);
        
        // Modify vertices to create slope
        const vertices = slopeGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const y = vertices[i+1]; // Y coordinate in the plane geometry
            
            // Linear gradient from 0 to height based on Y coordinate
            const normalizedY = (y + length/2) / length; // Normalize to 0-1
            vertices[i+2] = height * (1 - normalizedY); // Apply to Z coordinate
        }
        
        // Update normals for correct lighting
        slopeGeometry.computeVertexNormals();
        
        // Create slope mesh
        const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
        slope.rotation.x = -Math.PI / 2; // Rotate to horizontal
        slope.position.set(x, 0.01, zStart - length/2); // Position in front of hole
        this.scene.add(slope);
        
        // Create physics body for the slope
        if (this.physicsWorld) {
            // Use a heightfield shape for the slope
            const heightfieldData = [];
            const divisions = 20; // Match to geometry segments
            const sizeX = width;
            const sizeZ = length;
            
            // Create heightfield data from slope geometry
            for (let i = 0; i <= divisions; i++) {
                heightfieldData[i] = [];
                for (let j = 0; j <= divisions; j++) {
                    const normalizedJ = j / divisions;
                    heightfieldData[i][j] = height * (1 - normalizedJ);
                }
            }
            
            const heightfieldShape = new CANNON.Heightfield(heightfieldData, {
                elementSize: sizeX / divisions
            });
            
            const slopeBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(x - sizeX/2, 0, zStart - sizeZ),
                material: this.physicsWorld.groundMaterial
            });
            
            slopeBody.addShape(heightfieldShape, new CANNON.Vec3(sizeX/2, 0, sizeZ/2));
            slopeBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
            
            this.physicsWorld.addBody(slopeBody);
            this.obstacleBodies.push(slopeBody);
        }
        
        return { mesh: slope, body: slopeBody };
    }
    
    /**
     * Create a visual marker for the starting position
     */
    createStartMarker(position) {
        // Create a visible tee marker to show where to place the ball
        const teeBaseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeBaseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0077cc, // Blue color for visibility
            roughness: 0.5,
            metalness: 0.2
        });
        
        // Create the base (circular pad)
        const teeBase = new THREE.Mesh(teeBaseGeometry, teeBaseMaterial);
        teeBase.position.set(position.x, 0.03, position.z);
        teeBase.receiveShadow = true;
        teeBase.userData = { type: 'teeMarker', part: 'base' };
        this.scene.add(teeBase);
        
        // Create a white circle in the middle to indicate ball placement
        const teeDotGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24);
        const teeDotMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White for ball placement
            roughness: 0.4,
            metalness: 0.3
        });
        
        const teeDot = new THREE.Mesh(teeDotGeometry, teeDotMaterial);
        teeDot.position.set(position.x, 0.04, position.z);
        teeDot.receiveShadow = true;
        teeDot.userData = { type: 'teeMarker', part: 'dot' };
        this.scene.add(teeDot);
        
        // Create a group to return both objects
        const teeGroup = new THREE.Group();
        teeGroup.add(teeBase);
        teeGroup.add(teeDot);
        teeGroup.userData = { type: 'teeMarker', part: 'group' };
        
        return teeGroup;
    }
    
    /**
     * Get the start position for a specific hole (1-indexed)
     */
    getHoleStartPosition(holeNumber) {
        // Only one hole now (hole 1)
        if (holeNumber === 1 && this.startPositions.length > 0) {
            return this.startPositions[0];
        }
        
        // Default position if hole not found - at the tee end
        return new THREE.Vector3(0, 0.2, 8);
    }
    
    /**
     * Get the actual hole position for a specific hole (1-indexed)
     */
    getHolePosition(holeNumber) {
        // Only one hole now
        return new THREE.Vector3(0, 0, -8);
    }
    
    update() {
        // Animate the flag if it exists
        if (this.flag) {
            const vertices = this.flag.geometry.attributes.position.array;
            const origVerts = this.flagOrigVertices;
            
            // Make sure we have original vertices stored
            if (origVerts && origVerts.length === vertices.length) {
                const time = Date.now() * 0.003;
                
                // Update vertices for wave effect
                for (let i = 0; i < vertices.length; i += 3) {
                    const x = origVerts[i]; // Use original x position
                    // Increasing wave effect as we move away from flagpole
                    const waveStrength = (x / 0.6) * 0.15; // 0.6 is flag width
                    
                    // Create wave effect with time-based animation
                    vertices[i+1] = origVerts[i+1] + Math.sin(time * 2 + x * 10) * waveStrength;
                    vertices[i+2] = origVerts[i+2] + Math.cos(time + x * 5) * waveStrength * 0.5;
                }
                
                // Need to flag this so three.js knows to update
                this.flag.geometry.attributes.position.needsUpdate = true;
            }
        }
        
        // Call original update method if defined in parent class
        if (super.update) {
            super.update();
        }
    }
} 