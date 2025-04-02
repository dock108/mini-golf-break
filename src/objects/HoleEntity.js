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
        console.log('[HoleEntity] Creating visual green plane (using CSG) and physics body...');

        // --- 1. Create Visual Green Plane with CSG Hole --- 
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            roughness: 0.8,
            metalness: 0.1,
            // side: THREE.DoubleSide // Usually not needed for CSG results, start with default
        });

        // --- Base Green Geometry (Thin Box for CSG) ---
        const greenDepth = 0.01; // Needs some thickness for CSG
        const baseGreenGeometry = new THREE.BoxGeometry(this.width, greenDepth, this.length);
        const baseGreenMesh = new THREE.Mesh(baseGreenGeometry);
        // Position it centered at the desired surface height (its center, not top/bottom face)
        baseGreenMesh.position.y = this.surfaceHeight; 
        baseGreenMesh.updateMatrix(); // Important for CSG
        console.log('[HoleEntity] CSG: Created base green box');

        // --- Hole Cutter Geometry (Cylinder) ---
        const visualHoleRadius = 0.40; // Match rim inner radius
        const cutterHeight = greenDepth + 0.1; // Make it taller than the green box
        const holeCutterGeometry = new THREE.CylinderGeometry(
            visualHoleRadius, 
            visualHoleRadius, 
            cutterHeight, 
            32
        );
        const holeCutterMesh = new THREE.Mesh(holeCutterGeometry);
        
        // Position the cutter relative to the HoleEntity center
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        // Align cutter center with green mesh center vertically
        holeCutterMesh.position.set(localHolePos.x, this.surfaceHeight, localHolePos.z);
        holeCutterMesh.updateMatrix(); // Important for CSG
        console.log(`[HoleEntity] CSG: Created hole cutter cylinder at local (${localHolePos.x.toFixed(2)}, ${this.surfaceHeight}, ${localHolePos.z.toFixed(2)})`);

        // --- Perform CSG Subtraction ---
        console.log('[HoleEntity] CSG: Performing subtraction...');
        const visualGreenMesh = CSG.subtract(baseGreenMesh, holeCutterMesh);
        visualGreenMesh.material = greenMaterial; // Apply the material AFTER CSG
        console.log('[HoleEntity] CSG: Subtraction complete.');

        // The CSG result is already in the correct world orientation relative to the group center
        // No need to rotate it like a PlaneGeometry
        // Its position relative to the group is inherited from the baseGreenMesh
        visualGreenMesh.castShadow = false;
        visualGreenMesh.receiveShadow = true;
        this.group.add(visualGreenMesh);
        this.meshes.push(visualGreenMesh); 
        this.visualGreenY = this.surfaceHeight; // Store the reference surface height
        console.log(`[HoleEntity] Created visual green plane using CSG with hole at y=${this.visualGreenY}`);
        // Note: No need to dispose baseGreenMesh/holeCutterMesh geometries/meshes 
        // as they are intermediate and CSG manages the result.

        // --- Physics Body (Uses ORIGINAL PlaneGeometry -UNCHANGED) ---
        console.log('[HoleEntity] Creating physics body (Trimesh from simple PlaneGeometry)...');
        const physicsPlaneGeom = new THREE.PlaneGeometry(this.width, this.length, 1, 1);
        const physicsGroundMaterial = this.world.groundMaterial;
        if (!physicsPlaneGeom.index) {
            console.error('[HoleEntity] Physics plane geometry is not indexed.');
            return;
        }
        const vertices = physicsPlaneGeom.attributes.position.array;
        const indices = physicsPlaneGeom.index.array;
        if (!vertices || !indices || vertices.length === 0 || indices.length === 0) {
            console.error('[HoleEntity] Invalid vertices or indices for physics Trimesh.');
            return;
        }
        const groundShape = new CANNON.Trimesh(vertices, indices);
        const groundBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: physicsGroundMaterial,
        });
        groundBody.addShape(groundShape);
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        // Position/rotate physics body based on the GROUP's transform and surface height
        this.group.getWorldPosition(worldPos);
        this.group.getWorldQuaternion(worldQuat);
        // Adjust position for surface height and rotation
        groundBody.position.copy(worldPos).y += this.surfaceHeight;
        groundBody.quaternion.copy(worldQuat);
        // The simple plane needs rotation to lie flat
        const planeRotation = new CANNON.Quaternion();
        planeRotation.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.quaternion = groundBody.quaternion.mult(planeRotation);

        console.log(`[HoleEntity] Positioned Trimesh physics body at world (${groundBody.position.x.toFixed(2)}, ${groundBody.position.y.toFixed(2)}, ${groundBody.position.z.toFixed(2)})`);
        groundBody.userData = { type: 'green', holeIndex: this.config.index };
        this.world.addBody(groundBody);
        this.bodies.push(groundBody);
        console.log('[HoleEntity] Created Trimesh physics body from simple PlaneGeometry');
        physicsPlaneGeom.dispose();
        // --- End Physics Body Creation ---
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
     * Create the visual representation of the hole (the dark interior).
     */
    createHoleVisual() {
        // Get hole position relative to the HoleEntity group's center
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        
        // Parameters for the interior cylinder
        const holeInteriorRadius = 0.40; // Match visual rim radius
        const holeInteriorDepth = 0.25;  // Realistic depth

        // Use CylinderGeometry for the interior
        // Note: We make it open-ended (last arg = true) so no top/bottom faces are rendered.
        const interiorGeometry = new THREE.CylinderGeometry(
            holeInteriorRadius, 
            holeInteriorRadius, 
            holeInteriorDepth, 
            32, // Segments for smoothness
            1,  // Height segments
            true // Open-ended
        );

        // Dark, non-reflective material for the interior walls
        const interiorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // Slightly darker than example
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide // Render inner and outer surfaces (important for open cylinder)
        });

        const holeInteriorMesh = new THREE.Mesh(interiorGeometry, interiorMaterial);

        // Position the cylinder so its top opening is JUST slightly above the green surface level.
        // Explicitly calculate the target top edge Y, then find the center Y.
        const slightOffset = 0.01; // Increased offset further 
        const topEdgeY = this.visualGreenY + slightOffset;
        const cylinderCenterY = topEdgeY - (holeInteriorDepth / 2);
        holeInteriorMesh.position.set(localHolePos.x, cylinderCenterY, localHolePos.z);
        // Cylinder geometry is oriented along Y axis by default, no X rotation needed.

        // Allow the interior to receive shadows from the rim/ball, but don't cast shadows itself.
        holeInteriorMesh.castShadow = false;
        holeInteriorMesh.receiveShadow = true;

        this.group.add(holeInteriorMesh);
        this.meshes.push(holeInteriorMesh); // Track this mesh
        console.log('[HoleEntity] Created realistic interior visual for the hole.');
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