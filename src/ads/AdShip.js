import * as THREE from 'three';

/**
 * Represents a single advertising ship instance.
 * Handles mesh creation, banner setup, and basic animation based on ship type.
 * Generates banner textures dynamically using Canvas.
 */
export class AdShip {
    constructor(adData, shipType = 'default') {
        this.adData = adData;
        // Force a type for testing if default is passed
        this.shipType = shipType === 'default' ? ['nasa', 'alien', 'station'][Math.floor(Math.random() * 3)] : shipType;

        this.group = new THREE.Group();
        this.group.name = `AdShip_${this.shipType}_${adData.title.replace(/\s+/g, '_') || 'Untitled'}`;

        this.shipBodyMesh = null; // Main body mesh
        this.bannerMesh = null;   // The ad banner plane
        this.rotatingPart = null; // For space station animation
        this.canvasTexture = null; // Store reference to the texture for disposal

        this.createShipMesh();
        this.createBannerMesh(); // Will now generate and apply initial texture
    }

    createShipMesh() {
        let geometry;
        let material;

        switch (this.shipType) {
            case 'nasa':
                // Body: Capsule-like shape (cylinder + spheres)
                const nasaBodyHeight = 1.5;
                const nasaRadius = 0.4;
                const bodyGeom = new THREE.CylinderGeometry(nasaRadius, nasaRadius, nasaBodyHeight, 16);
                const sphereGeom = new THREE.SphereGeometry(nasaRadius, 16, 8);

                const bodyMesh = new THREE.Mesh(bodyGeom);
                const topSphere = new THREE.Mesh(sphereGeom);
                const bottomSphere = new THREE.Mesh(sphereGeom);
                topSphere.position.y = nasaBodyHeight / 2;
                bottomSphere.position.y = -nasaBodyHeight / 2;

                // Combine using a group (simpler than CSG for placeholders)
                this.shipBodyMesh = new THREE.Group();
                this.shipBodyMesh.add(bodyMesh, topSphere, bottomSphere);

                // Wings: Simple planes
                const wingGeom = new THREE.BoxGeometry(0.1, 0.8, 2); // Thin, tall, long wings
                const wingMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
                const leftWing = new THREE.Mesh(wingGeom, wingMat);
                const rightWing = new THREE.Mesh(wingGeom, wingMat);
                leftWing.position.set(-nasaRadius - 0.3, 0, 0);
                rightWing.position.set(nasaRadius + 0.3, 0, 0);
                this.shipBodyMesh.add(leftWing, rightWing);

                // Set main material
                material = new THREE.MeshStandardMaterial({ color: 0xE0E0E0 }); // Light grey
                this.shipBodyMesh.children.forEach(child => {if (child !== leftWing && child !== rightWing) child.material = material});

                break;

            case 'alien':
                // Saucer shape: Wide, flat cylinder
                geometry = new THREE.CylinderGeometry(1.2, 1.5, 0.3, 32);
                material = new THREE.MeshStandardMaterial({ color: 0x77FF77, metalness: 0.6, roughness: 0.3 }); // Metallic green
                this.shipBodyMesh = new THREE.Mesh(geometry, material);

                // Dome/Light on top
                const domeGeom = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const domeMat = new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.8 }); // Cyan glow
                const domeLight = new THREE.Mesh(domeGeom, domeMat);
                domeLight.position.y = 0.15; // Position slightly above the saucer base
                this.shipBodyMesh.add(domeLight); // Add as child

                break;

            case 'station':
                // Main structure: Torus ring
                geometry = new THREE.TorusGeometry(1.5, 0.2, 8, 32);
                material = new THREE.MeshStandardMaterial({ color: 0xAAAAFF, metalness: 0.8, roughness: 0.2 }); // Metallic blue
                this.shipBodyMesh = new THREE.Mesh(geometry, material);
                this.shipBodyMesh.rotation.x = Math.PI / 2; // Rotate torus to be flat

                // Add a central hub or structure (optional)
                const hubGeom = new THREE.SphereGeometry(0.5, 16, 16);
                const hubMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
                const hubMesh = new THREE.Mesh(hubGeom, hubMat);
                this.shipBodyMesh.add(hubMesh);

                // Add a rotating part (simple cylinder for now)
                const rotatingGeom = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
                const rotatingMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00 }); // Gold
                this.rotatingPart = new THREE.Mesh(rotatingGeom, rotatingMat);
                this.rotatingPart.rotation.x = Math.PI / 2;
                this.shipBodyMesh.add(this.rotatingPart);

                break;

            default: // Fallback to simple box
                geometry = new THREE.BoxGeometry(2, 0.5, 1);
                material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                this.shipBodyMesh = new THREE.Mesh(geometry, material);
                break;
        }

        this.shipBodyMesh.name = "ShipBody";
        this.group.add(this.shipBodyMesh);
    }

    /**
     * Generates a CanvasTexture displaying the given text.
     * @param {string} text The text to display on the banner.
     * @returns {THREE.CanvasTexture} The generated texture.
     */
    generateBannerTexture(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const canvasWidth = 256;
        const canvasHeight = 64;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // --- Style the banner --- 
        // Background
        context.fillStyle = '#101018'; // Dark blue/black background
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        // Text Style
        context.font = 'bold 24px Arial'; // Adjust font size/family as needed
        context.fillStyle = '#FFFFFF'; // White text
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Optional: Add a subtle glow or outline for LED effect
        // context.shadowColor = '#00FFFF';
        // context.shadowBlur = 5;

        // --- Draw Text --- 
        context.fillText(text, canvasWidth / 2, canvasHeight / 2);

        // --- Create Texture --- 
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space
        texture.needsUpdate = true; // Important for CanvasTexture
        return texture;
    }

    createBannerMesh() {
        const bannerWidth = 1.8;
        const bannerHeight = 0.6;
        const geometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);

        // Generate the initial texture
        this.canvasTexture = this.generateBannerTexture(this.adData.title);

        const material = new THREE.MeshBasicMaterial({
            map: this.canvasTexture,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false, 
            // blending: THREE.AdditiveBlending // Keep AdditiveBlending if desired
        });

        this.bannerMesh = new THREE.Mesh(geometry, material);
        this.bannerMesh.name = "AdBanner";

        // Adjust banner position based on ship type
        // NOTE: These offsets are relative to the ship's local coordinates BEFORE scaling
        let bannerYOffset = 0.3; // Default offset
        switch (this.shipType) {
            case 'nasa':
                bannerYOffset = 0.4 + 1.5 / 2; // Position above the capsule top sphere
                break;
            case 'alien':
                bannerYOffset = 0.4; // Increased offset to clear the dome
                break;
            case 'station':
                bannerYOffset = 0.7; // Position slightly higher above the central hub/torus
                break;
            default:
                bannerYOffset = 0.3;
                break;
        }

        this.bannerMesh.position.y = bannerYOffset;
        this.bannerMesh.rotation.x = -Math.PI / 2;

        this.group.add(this.bannerMesh);
    }

    /**
     * Updates the ship to display a new advertisement.
     * @param {object} newAdData The ad data object { title, url, ... }.
     */
    updateAd(newAdData) {
        if (!newAdData || newAdData.title === this.adData.title) {
            // console.log("Skipping ad update - no new data or title is the same.");
            return; // No update needed
        }

        console.log(`Updating ad on ship ${this.group.name} from '${this.adData.title}' to '${newAdData.title}'`);
        this.adData = newAdData;

        // Dispose the old texture
        if (this.bannerMesh && this.bannerMesh.material && this.bannerMesh.material.map) {
            this.bannerMesh.material.map.dispose();
            // console.log("Disposed old banner texture.");
        }

        // Generate and apply the new texture
        const newTexture = this.generateBannerTexture(this.adData.title);
        this.canvasTexture = newTexture; // Store new texture reference

        if (this.bannerMesh && this.bannerMesh.material) {
            this.bannerMesh.material.map = newTexture;
            this.bannerMesh.material.needsUpdate = true;
            // console.log("Applied new banner texture.");
        }
    }

    update(deltaTime) {
        // Ship-specific animations
        if (this.shipType === 'station' && this.rotatingPart) {
            this.rotatingPart.rotation.z += 0.5 * deltaTime;
        }
    }

    // setTexture method is no longer needed for external setting
    // setTexture(texture) { ... }

    dispose() {
        // Dispose main body mesh
        if (this.shipBodyMesh) {
             // Handle group for NASA type
            if (this.shipBodyMesh instanceof THREE.Group) {
                 this.shipBodyMesh.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) child.geometry.dispose();
                        // Materials might be shared, careful disposal if so
                        // For unique materials per part:
                        // if (child.material) child.material.dispose();
                    }
                });
                 // Dispose the shared material if applicable (used in NASA example)
                if (this.shipBodyMesh.children.length > 0 && this.shipBodyMesh.children[0].material && !Array.isArray(this.shipBodyMesh.children[0].material)) {
                    this.shipBodyMesh.children[0].material.dispose();
                }
                // Dispose wing material for NASA
                const wingMat = this.shipBodyMesh.children.find(c => c.name === "Wing")?.material;
                if (wingMat) wingMat.dispose();

            } else if (this.shipBodyMesh instanceof THREE.Mesh) {
                if (this.shipBodyMesh.geometry) this.shipBodyMesh.geometry.dispose();
                if (this.shipBodyMesh.material) {
                    if (Array.isArray(this.shipBodyMesh.material)) {
                        this.shipBodyMesh.material.forEach(m => m.dispose());
                    } else {
                        this.shipBodyMesh.material.dispose();
                    }
                }
            }

            // Dispose children explicitly added (like alien dome, station hub/rotor)
            this.shipBodyMesh.traverse(child => {
                if (child !== this.shipBodyMesh && child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                         if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });

            this.group.remove(this.shipBodyMesh);
        }

        // Dispose banner mesh
        if (this.bannerMesh) {
            if (this.bannerMesh.geometry) this.bannerMesh.geometry.dispose();
            if (this.bannerMesh.material) {
                // Dispose the canvas texture
                if (this.bannerMesh.material.map) {
                    this.bannerMesh.material.map.dispose();
                    // console.log("Disposed final banner texture map during ship disposal.");
                }
                this.bannerMesh.material.dispose();
            }
            this.group.remove(this.bannerMesh);
        }
         this.canvasTexture = null; // Clear reference
    }
} 