import * as THREE from 'three';

export class TeeMarker {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.arrowMesh = null;
        
        // Create the tee marker meshes
        this.createMesh();
    }
    
    createMesh() {
        // Create a circular base for the tee marker
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x4488ff,
            roughness: 0.4,
            metalness: 0.3,
            emissive: 0x1122aa,  // Stronger glow
            emissiveIntensity: 0.7
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0.025; // Just above the ground
        this.mesh.receiveShadow = true;
        
        // Create an arrow to indicate direction
        const arrowLength = 0.8;
        const arrowShape = new THREE.Shape();
        
        // Draw the arrow shape
        arrowShape.moveTo(0, 0);
        arrowShape.lineTo(-0.2, -0.3);
        arrowShape.lineTo(-0.1, -0.3);
        arrowShape.lineTo(-0.1, -arrowLength);
        arrowShape.lineTo(0.1, -arrowLength);
        arrowShape.lineTo(0.1, -0.3);
        arrowShape.lineTo(0.2, -0.3);
        arrowShape.lineTo(0, 0);
        
        const extrudeSettings = {
            depth: 0.05,
            bevelEnabled: false
        };
        
        const arrowGeometry = new THREE.ExtrudeGeometry(arrowShape, extrudeSettings);
        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            roughness: 0.4,
            metalness: 0.3,
            emissive: 0xaa1122,  // Stronger glow
            emissiveIntensity: 0.7
        });
        
        this.arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.arrowMesh.position.y = 0.05; // Just above the base
        this.arrowMesh.rotation.z = Math.PI; // Point in initial direction
        
        // Add meshes to the scene
        this.scene.add(this.mesh);
        this.scene.add(this.arrowMesh);
        
        // Group them for easier manipulation
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.arrowMesh);
        this.scene.add(this.group);
        
        // Initially hide the tee marker
        this.hide();
    }
    
    setPosition(position) {
        if (this.group) {
            this.group.position.x = position.x;
            this.group.position.z = position.z;
            // Keep y position just above ground level
            this.group.position.y = 0.03;
        }
    }
    
    setRotation(angle) {
        if (this.arrowMesh) {
            // Rotate the arrow to point in the specified direction
            this.arrowMesh.rotation.z = Math.PI + angle;
        }
    }
    
    show() {
        if (this.group) {
            this.group.visible = true;
        }
    }
    
    hide() {
        if (this.group) {
            this.group.visible = false;
        }
    }
    
    update() {
        // Can be used for animations or updates
        // Currently not needed
    }
    
    dispose() {
        // Clean up meshes when no longer needed
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        if (this.arrowMesh) {
            this.scene.remove(this.arrowMesh);
            this.arrowMesh.geometry.dispose();
            this.arrowMesh.material.dispose();
        }
        
        if (this.group) {
            this.scene.remove(this.group);
        }
    }
} 