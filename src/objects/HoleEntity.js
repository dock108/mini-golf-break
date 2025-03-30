import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSG } from 'three-csg-ts';

/**
 * HoleEntity - Encapsulates all resources and physics for a single hole
 */
export class HoleEntity {
    constructor(world, config, scene) {
        this.world = world;        // CANNON.World instance
        this.config = config;      // Hole configuration
        this.scene = scene;        // THREE.Scene instance
        
        this.meshes = [];         // Visual objects
        this.bodies = [];         // Physics bodies
        this.holeTrigger = null;  // Hole trigger body
        
        // Store dimensions
        this.width = Math.max(1, config.courseWidth || 4);
        this.length = Math.max(1, config.courseLength || 20);
        this.wallHeight = 1.0;
        this.wallThickness = 0.2;
        this.holeRadius = 0.35;
        this.surfaceHeight = 0.2;
        
        // Calculate center position
        this.centerPosition = new THREE.Vector3(
            (config.startPosition.x + config.holePosition.x) / 2,
            0,
            (config.startPosition.z + config.holePosition.z) / 2
        );
        
        console.log(`[HoleEntity] Initializing hole ${config.index + 1}:`, {
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
     */
    create() {
        console.log(`[HoleEntity] Creating hole components`);
        
        // Create main course group
        this.group = new THREE.Group();
        this.group.position.copy(this.centerPosition);
        this.scene.add(this.group);
        this.meshes.push(this.group);
        
        // --- Create Green using CSG --- 
        this.createCSGGreenSurface();
        
        // --- Create Metallic Rim around Hole --- 
        this.createHoleRim();
        
        // --- Create other components --- 
        this.createWalls();
        this.createHoleTrigger(); // No longer creates visual, only physics trigger
        this.createStartPosition();
        
        // Create hazards (Sand will now just create its visual mesh)
        if (this.config.hazards) {
            this.config.hazards.forEach(hazard => this.createHazard(hazard));
        }
        
        console.log(`[HoleEntity] Created hole with:`, {
            meshes: this.meshes.length,
            bodies: this.bodies.length,
            hazards: this.config.hazards?.length || 0
        });
        
        return true;
    }
    
    /**
     * Create the green surface with cutouts using CSG
     */
    createCSGGreenSurface() {
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide // Important for CSG results
        });

        // 1. Create base green geometry (centered at origin)
        // Increase segments for potentially smoother CSG results
        const greenGeom = new THREE.BoxGeometry(
            this.width, 
            this.surfaceHeight, 
            this.length,
            10, // widthSegments
            1,  // heightSegments
            10  // depthSegments
            );
        let greenCSG = CSG.fromGeometry(greenGeom);

        // 2. Subtract Sand Traps (if any)
        const sandHazards = this.config.hazards?.filter(h => h.type === 'sand') || [];
        sandHazards.forEach(hazardConfig => {
            const sandGeom = new THREE.BoxGeometry(
                hazardConfig.size.x,
                this.surfaceHeight, // Use surface height for subtraction depth
                hazardConfig.size.z
            );
            // Calculate position relative to the green's center 
            const localSandPos = hazardConfig.position.clone().sub(this.centerPosition);
            // Create transformation matrix
            const sandMatrix = new THREE.Matrix4().makeTranslation(localSandPos.x, 0, localSandPos.z);
            // Apply matrix to the geometry *before* creating CSG object
            sandGeom.applyMatrix4(sandMatrix);
            // Create CSG object from transformed geometry
            const sandCSG = CSG.fromGeometry(sandGeom);

            // Subtract
            greenCSG = greenCSG.subtract(sandCSG);
            console.log('[HoleEntity] Subtracted sand shape from green CSG');
        });

        // 3. Subtract Hole
        const holeGeom = new THREE.CylinderGeometry(
            this.holeRadius,
            this.holeRadius,
            this.surfaceHeight * 1.1, // Ensure it cuts through fully
            16
        );
        // Calculate position relative to the green's center
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        // Create transformation matrix
        const holeMatrix = new THREE.Matrix4().makeTranslation(localHolePos.x, 0, localHolePos.z);
        // Apply matrix to the geometry *before* creating CSG object
        holeGeom.applyMatrix4(holeMatrix);
        // Create CSG object from transformed geometry
        const holeCSG = CSG.fromGeometry(holeGeom);
        
        // Subtract
        greenCSG = greenCSG.subtract(holeCSG);
        console.log('[HoleEntity] Subtracted hole shape from green CSG');

        // 4. Convert final CSG back to Mesh
        const finalGreenMesh = CSG.toMesh(greenCSG, new THREE.Matrix4(), greenMaterial);
        finalGreenMesh.position.y = this.surfaceHeight / 2; // Position the final mesh correctly vertically
        
        // --- Recalculate Normals --- 
        finalGreenMesh.geometry.computeVertexNormals(); 
        console.log('[HoleEntity] Recalculated vertex normals for final green mesh');
        // --- End Recalculate Normals ---

        finalGreenMesh.castShadow = true;
        finalGreenMesh.receiveShadow = true;
        this.group.add(finalGreenMesh);
        this.meshes.push(finalGreenMesh);
        console.log('[HoleEntity] Created final green mesh from CSG');

        // --- Physics Body (Keep simple box for performance) --- 
        const greenBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: this.world.defaultMaterial
        });
        const mainSurfaceShape = new CANNON.Box(new CANNON.Vec3(
            this.width / 2,
            this.surfaceHeight / 2,
            this.length / 2
        ));
        // Position physics relative to world origin, not group origin
        greenBody.addShape(mainSurfaceShape, new CANNON.Vec3(0, this.surfaceHeight / 2, 0)); 
        greenBody.position.copy(this.centerPosition);
        greenBody.userData = { type: 'green', holeIndex: this.config.index };
        this.world.addBody(greenBody);
        this.bodies.push(greenBody);
        console.log('[HoleEntity] Created simple green physics body');
    }
    
    /**
     * Create the metallic rim around the hole opening.
     */
    createHoleRim() {
        // Calculate position relative to the group's center
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);

        const rimGeometry = new THREE.RingGeometry(
            this.holeRadius,        // Inner radius exactly matching the hole cutout
            this.holeRadius + 0.04, // Outer radius - make it thin
            32
        );

        // Metallic Material
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC, // Light silver/grey color
            roughness: 0.3,  // Smoother for metallic look
            metalness: 0.9,  // Much more metallic
            side: THREE.DoubleSide
        });

        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Lay flat
        // Position just above the *top* surface of the green
        const rimY = this.surfaceHeight + 0.001;
        rim.position.set(localHolePos.x, rimY, localHolePos.z);

        rim.receiveShadow = true; // Rim can receive shadows

        this.group.add(rim); // Add to the main group for this hole
        this.meshes.push(rim); // Track the mesh
        console.log('[HoleEntity] Created metallic hole rim mesh');
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
                position: [-this.width/2, this.wallHeight/2, 0],
                type: 'wall_left'
            },
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [this.width/2, this.wallHeight/2, 0],
                type: 'wall_right'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2, -this.length/2],
                type: 'wall_back'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2, this.length/2],
                type: 'wall_front'
            }
        ];
        
        walls.forEach(wall => {
            // Create visual mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            this.group.add(mesh);
            this.meshes.push(mesh);
            
            // Create physics body
            const body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                material: this.world.wallMaterial || this.world.defaultMaterial
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
     * Create hole trigger physics body (Visual removed)
     */
    createHoleTrigger() {
        // --- Physics Trigger (existing code remains) ---
        const holeTrigger = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            isTrigger: true,
            collisionResponse: false
        });
        const triggerShape = new CANNON.Cylinder(this.holeRadius, this.holeRadius, this.surfaceHeight, 16);
        holeTrigger.addShape(triggerShape);
        holeTrigger.position.copy(this.config.holePosition);
        holeTrigger.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        holeTrigger.collisionFilterGroup = 2;  
        holeTrigger.collisionFilterMask = 4;   
        holeTrigger.userData = { type: 'hole', holeIndex: this.config.index };
        this.world.addBody(holeTrigger);
        this.bodies.push(holeTrigger);
        this.holeTrigger = holeTrigger;
        console.log('[HoleEntity] Created hole trigger body (visual is part of green)');
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
        teeMesh.position.y = this.surfaceHeight + 0.03;
        
        this.group.add(teeMesh);
        this.meshes.push(teeMesh);
        
        console.log('[HoleEntity] Created start position marker');
    }
    
    /**
     * Create a hazard (sand trap, etc.)
     */
    createHazard(hazardConfig) {
        if (hazardConfig.type === 'sand') {
            // --- Create visual mesh to fill the CSG cutout --- 
            const sandGeometry = new THREE.BoxGeometry(
                hazardConfig.size.x,
                hazardConfig.size.y, // Use actual configured height for visual
                hazardConfig.size.z
            );
            const sandMaterial = new THREE.MeshStandardMaterial({
                color: 0xF4A460, 
                roughness: 0.8, 
                metalness: 0.1 
            });
            const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial);
            const localPos = hazardConfig.position.clone().sub(this.centerPosition); // Position relative to group center
            sandMesh.position.copy(localPos);
            // Position sand slightly below green surface level
            sandMesh.position.y = (this.surfaceHeight / 2) - (hazardConfig.size.y / 2) - 0.01;
            sandMesh.castShadow = true;
            sandMesh.receiveShadow = true;
            this.group.add(sandMesh);
            this.meshes.push(sandMesh);
            console.log('[HoleEntity] Created sand visual mesh to fill cutout');

            // --- Physics Body (remains the same, simple box is fine) --- 
            const sandBody = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                material: this.world.sandMaterial || this.world.defaultMaterial
            });
            const shape = new CANNON.Box(new CANNON.Vec3(
                hazardConfig.size.x / 2,
                hazardConfig.size.y / 2,
                hazardConfig.size.z / 2
            ));
            sandBody.addShape(shape);
            sandBody.position.copy(hazardConfig.position); // Use world position for physics
            sandBody.userData = { type: 'sand', holeIndex: this.config.index };
            this.world.addBody(sandBody);
            this.bodies.push(sandBody);
            console.log('[HoleEntity] Created sand physics body');
        }
        // TODO: Add other hazard types if needed
    }
    
    /**
     * Clean up all resources
     */
    destroy() {
        console.log('[HoleEntity] Destroying hole resources');
        
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
        this.holeTrigger = null;
        
        console.log('[HoleEntity] Cleanup complete');
    }
} 