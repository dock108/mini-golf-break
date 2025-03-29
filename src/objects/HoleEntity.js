import * as THREE from 'three';
import * as CANNON from 'cannon-es';

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
        
        // Create components
        this.createGreenSurface();
        this.createWalls();
        this.createHoleTrigger();
        this.createStartPosition();
        
        // Create hazards if any
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
     * Create the green surface with physics
     */
    createGreenSurface() {
        // Create visual mesh
        const greenGeometry = new THREE.BoxGeometry(this.width, this.surfaceHeight, this.length);
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            roughness: 0.5,
            metalness: 0.1
        });
        
        const greenMesh = new THREE.Mesh(greenGeometry, greenMaterial);
        greenMesh.position.y = this.surfaceHeight / 2;
        this.group.add(greenMesh);
        this.meshes.push(greenMesh);
        
        // Create physics body
        const greenBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: this.world.defaultMaterial
        });
        
        // Add main surface shape
        const mainSurface = new CANNON.Box(new CANNON.Vec3(
            this.width / 2,
            this.surfaceHeight / 2,
            this.length / 2
        ));
        greenBody.addShape(mainSurface, new CANNON.Vec3(0, this.surfaceHeight / 2, 0));
        
        // Add backup box to prevent tunneling
        const backupBox = new CANNON.Box(new CANNON.Vec3(
            this.width / 2,
            this.surfaceHeight,
            this.length / 2
        ));
        greenBody.addShape(backupBox, new CANNON.Vec3(0, -this.surfaceHeight / 2, 0));
        
        // Set position and add to world
        greenBody.position.copy(this.centerPosition);
        greenBody.userData = { type: 'green', holeIndex: this.config.index };
        
        this.world.addBody(greenBody);
        this.bodies.push(greenBody);
        
        console.log('[HoleEntity] Created green surface');
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
     * Create hole trigger for ball detection AND a visual representation
     */
    createHoleTrigger() {
        // --- Visual Hole --- 
        const holeVisualGeometry = new THREE.CylinderGeometry(
            this.holeRadius * 0.95, // Slightly smaller than physics trigger
            this.holeRadius * 0.95, 
            this.surfaceHeight * 1.1, // Slightly taller than surface height
            16
        );
        const holeVisualMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111, // Dark color
            side: THREE.DoubleSide // Render inside if needed
        });
        const holeVisualMesh = new THREE.Mesh(holeVisualGeometry, holeVisualMaterial);
        
        // Position the visual hole relative to the group's center
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        holeVisualMesh.position.copy(localHolePos);
        holeVisualMesh.position.y = this.surfaceHeight * 0.5 - 0.01; // Slightly below the green surface
        
        this.group.add(holeVisualMesh);
        this.meshes.push(holeVisualMesh);
        console.log('[HoleEntity] Created hole visual mesh');
        // --- End Visual Hole ---

        // --- Physics Trigger (existing code) ---
        const holeTrigger = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            isTrigger: true,
            collisionResponse: false
        });
        
        // Add cylinder shape for trigger
        const triggerShape = new CANNON.Cylinder(
            this.holeRadius,
            this.holeRadius,
            this.surfaceHeight,
            16
        );
        holeTrigger.addShape(triggerShape);
        
        // Position physics trigger at the absolute hole location (world space)
        holeTrigger.position.copy(this.config.holePosition);
        holeTrigger.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        
        // Set up collision filters
        holeTrigger.collisionFilterGroup = 2;  // Hole group
        holeTrigger.collisionFilterMask = 4;   // Ball group
        
        holeTrigger.userData = { type: 'hole', holeIndex: this.config.index };
        
        this.world.addBody(holeTrigger);
        this.bodies.push(holeTrigger);
        this.holeTrigger = holeTrigger;
        
        console.log('[HoleEntity] Created hole trigger body');
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
            // Create visual mesh
            const sandGeometry = new THREE.BoxGeometry(
                hazardConfig.size.x,
                hazardConfig.size.y,
                hazardConfig.size.z
            );
            
            const sandMaterial = new THREE.MeshStandardMaterial({
                color: 0xF4A460,
                roughness: 0.8,
                metalness: 0.1
            });
            
            const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial);
            const localPos = hazardConfig.position.clone().sub(this.centerPosition);
            sandMesh.position.copy(localPos);
            sandMesh.position.y = hazardConfig.size.y / 2;
            
            this.group.add(sandMesh);
            this.meshes.push(sandMesh);
            
            // Create physics body
            const sandBody = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                material: this.world.sandMaterial || this.world.defaultMaterial
            });
            
            sandBody.addShape(new CANNON.Box(new CANNON.Vec3(
                hazardConfig.size.x / 2,
                hazardConfig.size.y / 2,
                hazardConfig.size.z / 2
            )));
            
            sandBody.position.copy(hazardConfig.position);
            sandBody.position.y += hazardConfig.size.y / 2;
            
            sandBody.userData = { type: 'sand', holeIndex: this.config.index };
            
            this.world.addBody(sandBody);
            this.bodies.push(sandBody);
            
            console.log('[HoleEntity] Created sand trap');
        }
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