import * as THREE from 'three';

/**
 * Represents a single advertising ship instance.
 * Handles mesh creation, banner setup, and basic animation.
 */
export class AdShip {
    constructor(adData, shipType = 'default') {
        this.adData = adData;
        this.shipType = shipType;

        this.group = new THREE.Group();
        this.group.name = `AdShip_${adData.title.replace(/\s+/g, '_') || 'Untitled'}`;

        this.createShipMesh();
        this.createBannerMesh();

        // TODO: Load and apply texture to banner
    }

    createShipMesh() {
        // Placeholder: Simple Box Geometry for now
        // TODO: Implement different geometries based on shipType (NASA, Alien, Station)
        const geometry = new THREE.BoxGeometry(2, 0.5, 1); // Example dimensions
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        this.shipMesh = new THREE.Mesh(geometry, material);
        this.shipMesh.name = "ShipBody";
        this.group.add(this.shipMesh);
    }

    createBannerMesh() {
        // Placeholder: Simple Plane on top
        const bannerWidth = 1.8;
        const bannerHeight = 0.6;
        const geometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);

        // Basic material, texture will be loaded by manager/later step
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000, // Default black or placeholder color
            side: THREE.DoubleSide,
            transparent: true, // For potential alpha in textures
            opacity: 1
        });

        this.bannerMesh = new THREE.Mesh(geometry, material);
        this.bannerMesh.name = "AdBanner";

        // Position the banner slightly above the ship mesh
        this.bannerMesh.position.y = 0.3; // Adjust based on ship mesh height
        this.bannerMesh.rotation.x = -Math.PI / 2; // Rotate to be flat (horizontal)

        this.group.add(this.bannerMesh);
    }

    update(deltaTime) {
        // TODO: Implement ship-specific animations (e.g., rotation, bobbing)
        // Example: Slow rotation
        // this.group.rotation.y += 0.1 * deltaTime;
    }

    setTexture(texture) {
        if (this.bannerMesh && this.bannerMesh.material) {
            this.bannerMesh.material.map = texture;
            this.bannerMesh.material.needsUpdate = true;
            this.bannerMesh.material.color.set(0xffffff); // Set to white to show texture colors
            console.log(`Texture set for banner: ${this.adData.title}`);
        }
    }

    dispose() {
        // Dispose geometries and materials to free up GPU memory
        if (this.shipMesh) {
            if (this.shipMesh.geometry) this.shipMesh.geometry.dispose();
            if (this.shipMesh.material) this.shipMesh.material.dispose();
            this.group.remove(this.shipMesh);
        }
        if (this.bannerMesh) {
            if (this.bannerMesh.geometry) this.bannerMesh.geometry.dispose();
            if (this.bannerMesh.material) {
                if (this.bannerMesh.material.map) this.bannerMesh.material.map.dispose();
                this.bannerMesh.material.dispose();
            }
            this.group.remove(this.bannerMesh);
        }
        // Any other disposables (lights, effects)
    }
} 