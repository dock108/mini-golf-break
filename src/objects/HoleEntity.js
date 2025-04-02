import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSG } from 'three-csg-ts';

/**
 * BaseElement - Base class for all course elements
 * Provides common functionality for creation, physics setup, and destruction
 */
export class BaseElement {
    constructor(world, config, scene) {
        this.world = world;        // CANNON.World instance
        this.config = config;      // Element configuration
        this.scene = scene;        // THREE.Scene instance
        
        this.meshes = [];         // Visual objects
        this.bodies = [];         // Physics bodies
        this.group = null;        // Main group container
        
        // Common properties
        this.id = config.id || `element_${Math.floor(Math.random() * 10000)}`;
        this.name = config.name || 'Unnamed Element';
        this.elementType = config.type || 'generic';
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        
        console.log(`[BaseElement] Initializing ${this.elementType} (${this.name}):`, {
            id: this.id,
            position: this.position
        });
    }
    
    /**
     * Create the element - to be implemented by subclasses
     */
    create() {
        console.log(`[BaseElement] Creating ${this.elementType} (${this.name})`);
        
        // Create main element group
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);
        this.meshes.push(this.group);
        
        // Subclasses should override this method to add specific components
        
        return true;
    }
    
    /**
     * Create visual components - to be implemented by subclasses
     */
    createVisuals() {
        // Subclasses should override this method
        console.log(`[BaseElement] Base createVisuals called for ${this.elementType}`);
        return true;
    }
    
    /**
     * Create physics components - to be implemented by subclasses
     */
    createPhysics() {
        // Subclasses should override this method
        console.log(`[BaseElement] Base createPhysics called for ${this.elementType}`);
        return true;
    }
    
    /**
     * Update the element - for any animations or state changes
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Default implementation does nothing
        // Subclasses can override to implement animations or state changes
    }
    
    /**
     * Clean up all resources
     */
    destroy() {
        console.log(`[BaseElement] Destroying ${this.elementType} (${this.name})`);
        
        // Remove meshes from scene
        this.meshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        // Remove physics bodies
        this.bodies.forEach(body => {
            if (body && body.shapes) {
                body.shapes.forEach(shape => body.removeShape(shape));
                this.world.removeBody(body);
            }
        });
        
        // Clear arrays
        this.meshes = [];
        this.bodies = [];
        
        console.log(`[BaseElement] Cleanup complete for ${this.elementType}`);
    }
} 

/**
 * HoleEntity - Encapsulates all resources and physics for a single hole
 * Now extends BaseElement
 */
export class HoleEntity extends BaseElement {
    constructor(world, config, scene) {
        // Add required defaults to config
        const holeConfig = {
            ...config,
            type: 'hole',
            name: config.name || `Hole ${config.index + 1}`,
            position: config.centerPosition || new THREE.Vector3(
                (config.startPosition.x + config.holePosition.x) / 2,
                0,
                (config.startPosition.z + config.holePosition.z) / 2
            )
        };
        
        // Call parent constructor
        super(world, holeConfig, scene);
        
        // Hole-specific properties
        this.holeTrigger = null;  // Hole trigger body
        this.width = Math.max(1, config.courseWidth || 4);
        this.length = Math.max(1, config.courseLength || 20);
        this.wallHeight = 1.0;
        this.wallThickness = 0.2;
        this.holeRadius = 0.35;
        this.surfaceHeight = 0.2;
        
        // Calculate center position if not provided
        this.centerPosition = this.position;
        
        console.log(`[HoleEntity] Initialized hole ${config.index + 1} with dimensions:`, {
            width: this.width,
            length: this.length,
            center: this.centerPosition,
            config: {
                start: config.startPosition,
                hole: config.holePosition,
                par: config.par
            }
        });
    }
    
    /**
     * Create all hole components
     * @override
     */
    create() {
        // Initialize the base class implementation
        super.create();
        
        console.log(`[HoleEntity] Creating hole components`);
        
        // --- Create Green using CSG --- 
        this.createGreenSurfaceAndPhysics();
        
        // --- Create Metallic Rim around Hole --- 
        this.createHoleRim();
        
        // --- Create Visual Hole Mesh ---
        this.createHoleVisual();
        
        // --- Create other components --- 
        this.createWalls();
        this.createHoleTrigger();
        this.createStartPosition();
        
        // --- Create Bunker Trigger Zones --- 
        this.createBunkerTriggers();
        
        // --- Create Bunker Visuals (Sand Texture) ---
        this.createBunkerVisuals();
        
        console.log(`[HoleEntity] Created hole with:`, {
            meshes: this.meshes.length,
            bodies: this.bodies.length,
        });
        
        return true;
    }
    
    /**
     * Create the visual green surface (simple plane) and the physics body (complex Trimesh from CSG).
     */
    createGreenSurfaceAndPhysics() {
        console.log('[HoleEntity] Creating visual green plane and CSG physics body...');

        // --- 1. Create Visual Green Plane ---
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            roughness: 0.8, // Slightly rougher for less reflection
            metalness: 0.1,
            // side: THREE.DoubleSide // Not needed for PlaneGeometry unless viewed from below
        });

        // Use PlaneGeometry for the visual surface
        const visualGreenGeom = new THREE.PlaneGeometry(
            this.width, 
            this.length, 
            Math.max(1, Math.floor(this.width)), // Segments for potential future displacement/detail
            Math.max(1, Math.floor(this.length))
        ); 
        
        const visualGreenMesh = new THREE.Mesh(visualGreenGeom, greenMaterial);
        visualGreenMesh.rotation.x = -Math.PI / 2; // Rotate flat
        // Position the plane's center. The physics body origin will need to match this world position.
        // PlaneGeometry origin is at its center. We place it at the hole's defined surface height.
        visualGreenMesh.position.y = this.surfaceHeight; 
        
        visualGreenMesh.castShadow = false; // Flat plane doesn't need to cast shadow
        visualGreenMesh.receiveShadow = true;
        this.group.add(visualGreenMesh);
        this.meshes.push(visualGreenMesh); // Track visual mesh
        this.visualGreenY = this.surfaceHeight; // Store Y position for reference
        console.log(`[HoleEntity] Created visual green plane at y=${this.visualGreenY}`);


        // --- 2. Create Physics Body (Attempting Trimesh from visualGreenGeom) ---
        console.log('[HoleEntity] Creating physics body (Trimesh from visualGreenGeom)...');
        
        const physicsGroundMaterial = this.world.groundMaterial;
        
        // Ensure the geometry is indexed
        if (!visualGreenGeom.index) {
            console.error('[HoleEntity] Visual green geometry is not indexed. Cannot create Trimesh.');
            return; // Or handle error appropriately
        }
        
        const vertices = visualGreenGeom.attributes.position.array;
        const indices = visualGreenGeom.index.array;
        
        if (!vertices || !indices || vertices.length === 0 || indices.length === 0) {
            console.error('[HoleEntity] Invalid vertices or indices from visualGreenGeom.');
            return;
        }
        
        const groundShape = new CANNON.Trimesh(vertices, indices);
        
        const groundBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: physicsGroundMaterial,
            // Shape added after body creation
        });
        groundBody.addShape(groundShape);

        // Position and rotate the Trimesh body to match the visual mesh
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        visualGreenMesh.getWorldPosition(worldPos);
        visualGreenMesh.getWorldQuaternion(worldQuat);
        groundBody.position.copy(worldPos);
        groundBody.quaternion.copy(worldQuat);

        console.log(`[HoleEntity] Positioned Trimesh body at world (${groundBody.position.x.toFixed(2)}, ${groundBody.position.y.toFixed(2)}, ${groundBody.position.z.toFixed(2)})`);
        console.log(`[HoleEntity] Trimesh body Quaternion: (${groundBody.quaternion.x.toFixed(2)}, ${groundBody.quaternion.y.toFixed(2)}, ${groundBody.quaternion.z.toFixed(2)}, ${groundBody.quaternion.w.toFixed(2)})`);

        groundBody.userData = { type: 'green', holeIndex: this.config.index };
        this.world.addBody(groundBody);
        this.bodies.push(groundBody);
        console.log('[HoleEntity] Created Trimesh physics body from visualGreenGeom');

        /* // --- Simplified CANNON.Plane Code - Temporarily Disabled ---
        console.log('[HoleEntity] Creating SIMPLIFIED physics body (CANNON.Plane) for debugging...');
        // ... CANNON.Plane code ...
        console.log('[HoleEntity] Created simplified Plane physics body');
        */ // --- End of Disabled Plane Code ---
        
        /* // --- Original CSG/Trimesh Code - Temporarily Disabled ---
        console.log('[HoleEntity] Generating CSG geometry for physics Trimesh...');
        // ... (rest of the CSG and Trimesh creation code is commented out) ...
        // physicsGeometry.dispose(); // Geometry would be disposed here if Trimesh was created
        console.log('[HoleEntity] Created Trimesh green physics body');
        */ // --- End of Disabled CSG Code ---
    }
    
    /**
     * Create the metallic rim around the hole opening.
     * Needs to be positioned relative to the visual green plane.
     */
    createHoleRim() {
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        const visualHoleRadius = 0.40; // Visual radius for the rim's inner edge

        const rimGeometry = new THREE.RingGeometry(
            visualHoleRadius,        
            visualHoleRadius + 0.04, 
            32
        );

        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC, 
            roughness: 0.3,  
            metalness: 0.9,  
            // side: THREE.DoubleSide // May not be needed if always viewed from above
        });

        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Lay flat
        
        // Position slightly ABOVE the visual green surface
        const rimY = this.visualGreenY + 0.002; // Use stored Y + small offset
        rim.position.set(localHolePos.x, rimY, localHolePos.z);

        rim.receiveShadow = true; 

        this.group.add(rim); 
        this.meshes.push(rim); 
        console.log('[HoleEntity] Created metallic hole rim mesh');
    }

    /**
     * Create a simple visual representation for the hole opening.
     */
     createHoleVisual() {
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        const visualHoleRadius = 0.40; // Match the inner radius of the rim

        // Simple black circle slightly below the green surface
        const holeVisualGeometry = new THREE.CircleGeometry(visualHoleRadius, 32);
        const holeVisualMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x111111, // Dark color for the hole
            side: THREE.DoubleSide // Visible even if camera goes below slightly
        });

        const holeVisualMesh = new THREE.Mesh(holeVisualGeometry, holeVisualMaterial);
        holeVisualMesh.rotation.x = -Math.PI / 2; // Lay flat

        // Position slightly BELOW the visual green surface
        const holeVisualY = this.visualGreenY - 0.001; // Use stored Y - small offset
        holeVisualMesh.position.set(localHolePos.x, holeVisualY, localHolePos.z);
        
        // No shadows needed for the visual hole
        holeVisualMesh.castShadow = false;
        holeVisualMesh.receiveShadow = false; 

        this.group.add(holeVisualMesh);
        this.meshes.push(holeVisualMesh); // Track this mesh
        console.log('[HoleEntity] Created visual hole mesh');
    }
    
    /**
     * Create course walls with physics
     */
    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const walls = [
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [-this.width/2, this.wallHeight/2 + this.surfaceHeight, 0],
                type: 'wall_left'
            },
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [this.width/2, this.wallHeight/2 + this.surfaceHeight, 0],
                type: 'wall_right'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2 + this.surfaceHeight, -this.length/2],
                type: 'wall_back'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2 + this.surfaceHeight, this.length/2],
                type: 'wall_front'
            }
        ];
        
        walls.forEach(wall => {
            // Create visual mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            // Ensure shadows are cast/received correctly
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);
            this.meshes.push(mesh);
            
            // Create physics body
            const body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                material: this.world.bumperMaterial // Corrected material
            });
            
            body.addShape(new CANNON.Box(new CANNON.Vec3(
                wall.size[0] / 2,
                wall.size[1] / 2,
                wall.size[2] / 2
            )));
            
            // Convert local position to world position
            const worldPos = new THREE.Vector3(...wall.position).add(this.centerPosition);
            body.position.copy(worldPos);
            
            body.userData = { type: wall.type, holeIndex: this.config.index };
            
            this.world.addBody(body);
            this.bodies.push(body);
            
            console.log(`[PhysicsWorld] Added body of type: ${wall.type}`);
        });
        
        console.log('[HoleEntity] Created walls');
    }
    
    /**
     * Create the physics trigger volume for the hole.
     */
    createHoleTrigger() {
        const holePosition = this.config.holePosition;
        // Make trigger radius slightly larger than visual hole for better detection
        const triggerRadius = this.holeRadius + 0.05; 
        const triggerHeight = 0.1; // Thin cylinder trigger

        const holeTriggerBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            isTrigger: true, // Use isTrigger property for Cannon-es >= v0.6.2
            // collisionResponse: false, // Alternative for older versions
            material: null // No physical interaction needed
        });

        // Cylinder shape: radiusTop, radiusBottom, height, numSegments
        const triggerShape = new CANNON.Cylinder(triggerRadius, triggerRadius, triggerHeight, 16);
        
        // Offset not needed if body position is set correctly
        holeTriggerBody.addShape(triggerShape);

        // Position the trigger centered at the hole, vertically AT the green surface
        holeTriggerBody.position.set(holePosition.x, this.visualGreenY, holePosition.z);
        
        // Important: Set userData to identify this body during collisions
        holeTriggerBody.userData = { type: 'holeTrigger', holeIndex: this.config.index };
        
        this.world.addBody(holeTriggerBody);
        this.bodies.push(holeTriggerBody);
        console.log(`[HoleEntity] Created hole trigger volume at Y=${this.visualGreenY.toFixed(2)}`);
    }
    
    /**
     * Create start position marker
     */
    createStartPosition() {
        // Create visual marker (similar to existing code)
        const teeGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077cc,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const teeMesh = new THREE.Mesh(teeGeometry, teeMaterial);
        const localStartPos = this.config.startPosition.clone().sub(this.centerPosition);
        teeMesh.position.copy(localStartPos);
        // Position slightly above the visual green surface
        teeMesh.position.y = this.visualGreenY + 0.03; 
        
        this.group.add(teeMesh);
        this.meshes.push(teeMesh);
        
        console.log('[HoleEntity] Created start position marker');
    }
    
    /**
     * Create physics trigger bodies for bunker zones based on config.
     */
    createBunkerTriggers() {
        const bunkerConfigs = this.config.hazards?.filter(h => h.type === 'sand') || [];
        console.log(`[HoleEntity] Creating ${bunkerConfigs.length} bunker trigger zones.`);

        bunkerConfigs.forEach(bunkerConfig => {
            if (!this.world) return; // Safety check

            // Use dimensions from config, providing defaults
            const radius = bunkerConfig.size?.x / 2 || 2;
            const depth = bunkerConfig.size?.y || 0.5;

            // Use a simple Box shape for the trigger volume
            const triggerSize = new CANNON.Vec3(radius * 1.1, depth, radius * 1.1); // Slightly larger overlap
            const triggerShape = new CANNON.Box(triggerSize.scale(0.5)); // CANNON.Box takes half-extents

            const triggerBody = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                collisionResponse: false, // IMPORTANT: Makes it a trigger
                material: null, // No physical material interaction needed
                collisionFilterGroup: 8, // Assign to a specific group (e.g., 8 for triggers)
                collisionFilterMask: 4   // Only detect collisions with the ball (group 4)
            });

            triggerBody.addShape(triggerShape);

            // Position the trigger body using the WORLD position from the config
             // Adjust Y position to be centered within the depression depth
            const triggerY = bunkerConfig.position.y; 
            triggerBody.position.set(bunkerConfig.position.x, triggerY, bunkerConfig.position.z);

            triggerBody.userData = { isBunkerZone: true }; // Identify this body

            this.world.addBody(triggerBody);
            this.bodies.push(triggerBody); // Track the body
            console.log(`[HoleEntity] Added bunker trigger zone at world pos: (${triggerBody.position.x.toFixed(2)}, ${triggerBody.position.y.toFixed(2)}, ${triggerBody.position.z.toFixed(2)})`);
        });
    }
    
    /**
     * Creates visual sand meshes placed at the bottom of bunker depressions.
     */
    createBunkerVisuals() {
        const bunkerConfigs = this.config.hazards?.filter(h => h.type === 'sand') || [];
        if (bunkerConfigs.length === 0) return; // No sand hazards configured

        console.log(`[HoleEntity] Creating ${bunkerConfigs.length} bunker visual meshes.`);

        const sandMaterial = new THREE.MeshStandardMaterial({
            color: 0xE6C388, // Sandy color
            roughness: 0.9,
            metalness: 0.1,
            map: null, // TODO: Add a sand texture later if desired
        });
        // Ensure material is disposed later - maybe track separately or add to standard disposal

        bunkerConfigs.forEach(bunkerConfig => {
            const radius = bunkerConfig.size?.x / 2 || 2;
            const depth = bunkerConfig.size?.y || 0.5;

            // Create a plane slightly smaller than the radius to fit inside the depression
            const sandGeometry = new THREE.PlaneGeometry(radius * 2 * 0.95, radius * 2 * 0.95); // Width, Height for Plane

            const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial);

            // Place slightly below the *visual* green surface 
            const sandY = this.visualGreenY - 0.02; // Use stored visual Y - offset

            // Use LOCAL position relative to the group center
            const localBunkerPos = bunkerConfig.position.clone().sub(this.centerPosition);
            sandMesh.position.set(localBunkerPos.x, sandY, localBunkerPos.z);

            sandMesh.rotation.x = -Math.PI / 2; // Rotate flat

            sandMesh.receiveShadow = true; // Allow sand to receive shadows

            this.group.add(sandMesh);
            this.meshes.push(sandMesh); // Track for disposal
            console.log(`[HoleEntity] Added sand visual mesh at local pos: (${sandMesh.position.x.toFixed(2)}, ${sandMesh.position.y.toFixed(2)}, ${sandMesh.position.z.toFixed(2)})`);
        });
    }
} 