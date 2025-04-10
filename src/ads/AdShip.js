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
                const torusRadius = 1.5;
                const tubeRadius = 0.3; 
                geometry = new THREE.TorusGeometry(torusRadius, tubeRadius, 12, 48);
                material = new THREE.MeshStandardMaterial({ color: 0xBBBBBB, metalness: 0.9, roughness: 0.3 }); 
                this.shipBodyMesh = new THREE.Mesh(geometry, material); 
                this.shipBodyMesh.rotation.x = Math.PI / 2; // Rotate torus to be flat

                // Add a central hub or structure (optional)
                const hubRadius = 0.6; 
                const hubGeom = new THREE.SphereGeometry(hubRadius, 24, 24);
                const hubMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.4 });
                const hubMesh = new THREE.Mesh(hubGeom, hubMat);
                this.shipBodyMesh.add(hubMesh); // Add hub as child of the torus mesh
                
                this.rotatingPart = null; // Ensure it's null
                // Clear separate torus/hub refs if they exist from previous edits
                this.torusMesh = null;
                this.hubMesh = null;

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
        const canvasWidth = 512; // Keep width for resolution
        const canvasHeight = 100; // Adjusted height for ~5:1 ratio
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // --- Style the banner --- 
        context.fillStyle = '#202030'; 
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        // Text Style
        context.font = 'bold 36px Arial'; // Adjusted font size for narrow banner
        context.fillStyle = '#FFFFFF'; // White text
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Re-add subtle glow
        context.shadowColor = 'rgba(255,255,255,0.6)'; 
        context.shadowBlur = 6;

        // --- Draw Text --- 
        const maxWidth = canvasWidth * 0.9; 
        const words = text.split(' ');
        let line = '';
        const lines = [];
        const yStart = canvasHeight / 2;

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line.trim());

        const lineHeight = 40; // Adjusted line height for 36px font
        const totalTextHeight = lines.length * lineHeight;
        let currentY = yStart - (totalTextHeight / 2) + (lineHeight / 2);

        // Clear shadow for drawing background
        context.shadowColor = 'transparent'; 
        context.shadowBlur = 0;
        context.fillStyle = '#202030'; 
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Re-apply shadow for text render
        context.shadowColor = 'rgba(255,255,255,0.6)'; 
        context.shadowBlur = 6;
        context.fillStyle = '#FFFFFF'; // White text

        lines.forEach(lineText => {
            context.fillText(lineText, canvasWidth / 2, currentY);
            currentY += lineHeight;
        });

        // --- Create Texture --- 
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space
        texture.needsUpdate = true; // Important for CanvasTexture
        return texture;
    }

    createBannerMesh() {
        let geometry;
        let bannerWidth = 3.0; // Width for ~5:1 banner
        let bannerHeight = 0.6; // Height for ~5:1 banner
        
        // Calculate Y offset dynamically
        let topY = 0.5; // Default fallback
        if (this.shipBodyMesh) {
            // Use a bounding box to estimate the top point
            const bbox = new THREE.Box3().setFromObject(this.shipBodyMesh, true); // true for precise
            topY = bbox.max.y;
        }
        let bannerYOffset = topY + 0.3; // Position 0.3 units above the estimated top
        
        let bannerRotationX = -Math.PI / 2 + Math.PI / 8; // Tilt slightly upwards (~22.5 deg)
        let bannerPosition = new THREE.Vector3(0, bannerYOffset, 0); // Use calculated offset

        // Generate the initial texture
        this.canvasTexture = this.generateBannerTexture(this.adData.title);

        const material = new THREE.MeshBasicMaterial({
            map: this.canvasTexture,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false, 
        });

        // No more switch statement - use standard plane for all
        geometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
       
        this.bannerMesh = new THREE.Mesh(geometry, material);
        this.bannerMesh.name = "AdBanner";
        this.bannerMesh.userData = { adData: this.adData }; // Store adData for click lookup

        this.bannerMesh.position.copy(bannerPosition);
        this.bannerMesh.rotation.x = bannerRotationX;
       
        // Add banner directly to the main ship group for all types
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