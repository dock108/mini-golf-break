import * as THREE from 'three';
import { AdShip } from './AdShip';
import { mockAds } from './adConfig';

/**
 * Manages the lifecycle, placement, and updates for all AdShip instances.
 * Ships orbit or fly linearly under the course based on type.
 */
export class AdShipManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = "AdShipsContainer";
        this.group.userData = { permanent: true, type: 'AdShipContainer' }; // Mark as permanent
        this.ships = [];
        this.isInitialized = false;

        // --- Configuration ---
        // PERFORMANCE NOTE: maxShips is currently low (4) because the collision avoidance
        // check in update() is O(N^2). Increasing this significantly without further
        // optimization (e.g., spatial partitioning) will impact performance.
        this.maxShips = 4;
        this.minVerticalOffset = -15;
        this.maxVerticalOffset = -25;
        this.minAdDuration = 30;
        this.maxAdDuration = 60;

        // Movement Area (used for linear recycling bounds and initial orbit placement)
        this.movementAreaSize = 100; // Size of the square area ships generally occupy
        this.boundaryBuffer = 30; // Extra distance before linear ships recycle

        // Orbital Specific (for stations)
        this.minOrbitRadius = 20;
        this.maxOrbitRadius = 50;
        this.minAngularSpeed = 0.05;
        this.maxAngularSpeed = 0.2;

        // Linear Specific (for nasa/alien)
        this.linearShipSpeed = 8.0; // Speed for ships flying straight

        // Collision Avoidance
        this.shipSafetyRadius = 10.0; // Minimum distance between ship centers (after scaling)
        this.slowdownFactor = 0.1; // Speed factor when slowed down
        this.slowdownDuration = 2.0; // Seconds to stay slowed down

        // Calculate bounds once
        this.minBound = -this.movementAreaSize / 2 - this.boundaryBuffer;
        this.maxBound = this.movementAreaSize / 2 + this.boundaryBuffer;
    }

    init() {
        if (this.isInitialized) return;
        console.log("Initializing AdShipManager...");
        this.spawnInitialShips();
        this.isInitialized = true;
        console.log(`AdShipManager Initialized with ${this.ships.length} ships.`);
    }

    spawnInitialShips() {
        console.log(`Spawning initial ${this.maxShips} ships...`);
        const initialAds = this.getInitialAds(this.maxShips);
        initialAds.forEach(adData => {
            this.spawnShip(adData);
        });
    }

    spawnShip(adData) {
        if (!adData) {
             console.warn("[AdShipManager] Tried to spawn ship with null adData.");
             return null;
        }

        try {
            const ship = new AdShip(adData);
            this.ships.push(ship);
            this.group.add(ship.group);

            // --- Collision Avoidance State --- 
            ship.isSlowedDown = false;
            ship.slowdownTimer = 0;

            // --- Ad Timer --- 
            ship.adDisplayTime = 0;
            ship.adDisplayDuration = this.minAdDuration + Math.random() * (this.maxAdDuration - this.minAdDuration);

            // --- Assign Movement Type & Parameters --- 
            if (ship.shipType === 'station') {
                ship.movementType = 'orbit';
                ship.orbitRadius = this.minOrbitRadius + Math.random() * (this.maxOrbitRadius - this.minOrbitRadius);
                ship.orbitAngle = Math.random() * Math.PI * 2;
                const speed = this.minAngularSpeed + Math.random() * (this.maxAngularSpeed - this.minAngularSpeed);
                ship.angularSpeed = speed * (Math.random() < 0.5 ? 1 : -1);

                // Initial position near center for orbiters
                const initialRadius = Math.random() * (this.movementAreaSize / 3);
                const initialAngle = Math.random() * Math.PI * 2;
                const initialX = initialRadius * Math.cos(initialAngle);
                const initialZ = initialRadius * Math.sin(initialAngle);
                ship.group.position.set(initialX, ship.verticalOffset, initialZ); // Use assigned offset

            } else { // 'nasa' or 'alien'
                ship.movementType = 'linear';
                const startPosVel = this._getLinearStartPosAndVel();
                ship.group.position.set(startPosVel.position.x, ship.verticalOffset, startPosVel.position.z); // Use assigned offset
                ship.velocity = startPosVel.velocity;
            }

            // --- Common Setup --- 
            this._orientShip(ship);
            ship.group.scale.set(4, 4, 4); // Apply scale

            console.log(`Created AdShip: ${adData.title} type ${ship.shipType} mode: ${ship.movementType}`);
            return ship;

        } catch (error) {
            console.error(`Error creating ship for ad: ${adData.title}`, error);
            return null;
        }
    }

    /** Gets a starting position just outside bounds and a velocity pointing across */
    _getLinearStartPosAndVel() {
        const position = new THREE.Vector3();
        const velocity = new THREE.Vector3();
        const edge = Math.floor(Math.random() * 4); // 0: +X, 1: -X, 2: +Z, 3: -Z
        const randPosAlongEdge = (Math.random() - 0.5) * this.movementAreaSize;

        // Y is set later using ship.verticalOffset

        switch (edge) {
            case 0: // Start at +X edge, move -X
                position.set(this.maxBound - 1, 0, randPosAlongEdge); // Set Y to 0 temporarily
                velocity.set(-this.linearShipSpeed, 0, (Math.random() - 0.5) * 0.2 * this.linearShipSpeed); // Slight Z variance
                break;
            case 1: // Start at -X edge, move +X
                position.set(this.minBound + 1, 0, randPosAlongEdge);
                velocity.set(this.linearShipSpeed, 0, (Math.random() - 0.5) * 0.2 * this.linearShipSpeed);
                break;
            case 2: // Start at +Z edge, move -Z
                position.set(randPosAlongEdge, 0, this.maxBound - 1);
                velocity.set((Math.random() - 0.5) * 0.2 * this.linearShipSpeed, 0, -this.linearShipSpeed);
                break;
            case 3: // Start at -Z edge, move +Z
                position.set(randPosAlongEdge, 0, this.minBound + 1);
                velocity.set((Math.random() - 0.5) * 0.2 * this.linearShipSpeed, 0, this.linearShipSpeed);
                break;
        }
        velocity.normalize().multiplyScalar(this.linearShipSpeed);
        return { position, velocity };
    }

     _orientShip(ship) {
        if (!ship || !ship.group) return;
        const lookAtY = ship.verticalOffset || this.minVerticalOffset; // Use ship's Y or fallback

        if (ship.movementType === 'orbit') {
            const tangentX = -ship.orbitRadius * Math.sin(ship.orbitAngle) * Math.sign(ship.angularSpeed);
            const tangentZ = ship.orbitRadius * Math.cos(ship.orbitAngle) * Math.sign(ship.angularSpeed);
            ship.group.lookAt(ship.group.position.x + tangentX, lookAtY, ship.group.position.z + tangentZ);
        } else if (ship.movementType === 'linear' && ship.velocity && ship.velocity.lengthSq() > 0.001) {
             const lookAtPos = new THREE.Vector3().copy(ship.group.position).add(ship.velocity);
            ship.group.lookAt(lookAtPos.x, lookAtY, lookAtPos.z);
        }
     }

    update(deltaTime) {
        if (!this.isInitialized || this.ships.length === 0) return;

        // OPTIMIZATION: Define a max distance from origin beyond which we skip updates
        const MAX_UPDATE_DISTANCE_SQ = (this.movementAreaSize * 1.5) * (this.movementAreaSize * 1.5); // e.g., 1.5x the main movement area size, squared
        const worldOrigin = new THREE.Vector3(0, 0, 0); // Reusable vector

        this.ships.forEach((ship, i) => {

            // --- OPTIMIZATION: Basic Visibility/Relevance Check --- 
            const distFromOriginSq = ship.group.position.distanceToSquared(worldOrigin);
            if (distFromOriginSq > MAX_UPDATE_DISTANCE_SQ) {
                // Ship is very far from the center, potentially skip its update?
                // For now, we'll just log it. A more robust implementation could fully skip.
                // console.log(`Ship ${ship.adData.title} is far (${Math.sqrt(distFromOriginSq).toFixed(0)} units), potential update skip.`);
                 // If skipping, ensure timers don't advance inappropriately, might need separate logic
                // continue; // Uncomment to actually skip the rest of the loop for this ship
            }

            let effectiveDeltaTime = deltaTime;
            const currentY = ship.verticalOffset || this.minVerticalOffset; // Ensure Y is consistent

            // --- Handle existing slowdown --- 
            if (ship.isSlowedDown) {
                ship.slowdownTimer -= deltaTime;
                if (ship.slowdownTimer <= 0) {
                    ship.isSlowedDown = false;
                    ship.slowdownTimer = 0;
                    // console.log(`Ship ${ship.adData.title} resuming normal speed.`);
                } else {
                    effectiveDeltaTime *= this.slowdownFactor;
                    // Skip collision *checks* for this ship if it's already slowed
                }
            }

            // --- Simple Collision Avoidance Check --- 
            // PERFORMANCE NOTE: This is an O(N^2) check (N=number of ships).
            // It includes a distanceToSquared optimization to quickly discard far ships,
            // but will still scale poorly with a large number of ships.
            // Consider spatial partitioning (e.g., grid or octree) for larger N.
            if (!ship.isSlowedDown) {
                // OPTIMIZATION: Only check against ships within a certain range
                const checkRadiusSq = (this.shipSafetyRadius * 2.5) * (this.shipSafetyRadius * 2.5); // Check slightly larger radius, squared

                for (let j = i + 1; j < this.ships.length; j++) {
                    const otherShip = this.ships[j];
                    if (otherShip.isSlowedDown) continue; // Don't check against already slowed ships

                    // OPTIMIZATION 1: Rough distance check first (squared distance is cheaper)
                    const distSq = ship.group.position.distanceToSquared(otherShip.group.position);
                    if (distSq > checkRadiusSq) {
                        continue; // Too far apart, skip detailed check
                    }

                    // OPTIMIZATION 2: If close enough for potential collision, use exact distance
                    // (Could also use a simpler bounding box check here if ships have known dimensions)
                    const distance = Math.sqrt(distSq);

                    if (distance < this.shipSafetyRadius) {
                        // Too close - slow down the current ship (ship `i`)
                        // console.warn(`Ships ${ship.adData.title} and ${otherShip.adData.title} too close (${distance.toFixed(1)} < ${this.shipSafetyRadius}). Slowing ${ship.adData.title}.`);
                        ship.isSlowedDown = true;
                        ship.slowdownTimer = this.slowdownDuration;
                        effectiveDeltaTime *= this.slowdownFactor;
                        break; // Stop checking for this ship once a collision is detected
                    }
                }
            }

            // --- Update Position (using effectiveDeltaTime) --- 
            if (ship.movementType === 'orbit') {
                ship.orbitAngle += ship.angularSpeed * effectiveDeltaTime;
                const newX = ship.orbitRadius * Math.cos(ship.orbitAngle);
                const newZ = ship.orbitRadius * Math.sin(ship.orbitAngle);
                ship.group.position.set(newX, currentY, newZ); // Use ship's assigned Y
            } else if (ship.movementType === 'linear') {
                ship.group.position.addScaledVector(ship.velocity, effectiveDeltaTime);
                // Ensure linear ships maintain their vertical offset
                if (ship.group.position.y !== currentY) {
                     ship.group.position.y = currentY;
                }
            }

            // --- Update Orientation --- 
            this._orientShip(ship);

            // --- Update Internal Animations (e.g., station rotation) --- 
            ship.update(deltaTime); // Use original deltaTime for internal animations

            // --- Recycle Linear Ships --- 
            if (ship.movementType === 'linear') {
                const pos = ship.group.position;
                if (pos.x > this.maxBound || pos.x < this.minBound || pos.z > this.maxBound || pos.z < this.minBound) {
                    console.log(`Recycling linear ship: ${ship.adData.title}`);
                    const nextAd = this.getNextAd(ship.adData.title);
                    ship.updateAd(nextAd);
                    ship.adDisplayTime = 0;
                    ship.adDisplayDuration = this.minAdDuration + Math.random() * (this.maxAdDuration - this.minAdDuration);

                    const newStart = this._getLinearStartPosAndVel();
                    // Assign a *new* vertical offset when recycling
                    ship.verticalOffset = this.minVerticalOffset + Math.random() * (this.maxVerticalOffset - this.minVerticalOffset);
                    ship.group.position.set(newStart.position.x, ship.verticalOffset, newStart.position.z); // Use new offset
                    ship.velocity = newStart.velocity;
                    this._orientShip(ship); // Re-orient for new path
                    ship.isSlowedDown = false; // Ensure recycled ships aren't slowed
                    ship.slowdownTimer = 0;
                    console.log(`Recycled linear ${ship.adData.title} to pos: (${newStart.position.x.toFixed(1)}, ${ship.verticalOffset.toFixed(1)}, ${newStart.position.z.toFixed(1)})`);
                }
            }

            // --- Check Ad Timer (Common to both types) --- 
            ship.adDisplayTime += deltaTime; // Use original deltaTime for timer
            if (ship.adDisplayTime >= ship.adDisplayDuration) {
                const nextAd = this.getNextAd(ship.adData.title);
                ship.updateAd(nextAd);
                ship.adDisplayTime = 0;
                ship.adDisplayDuration = this.minAdDuration + Math.random() * (this.maxAdDuration - this.minAdDuration);
            }
        });
    }

    cleanup() {
        console.log("Cleaning up AdShipManager...");
        this.ships.forEach(ship => {
            ship.dispose();
        });
        this.ships = [];
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }
        this.isInitialized = false;
        console.log("AdShipManager Cleaned up.");
    }

    // --- Helper methods --- 
    getInitialAds(count) {
        const uniqueAds = [...new Map(mockAds.map(ad => [ad.title, ad])).values()];
        const adsToUse = uniqueAds.slice(0, count);
        while (adsToUse.length < count && mockAds.length > 0) {
            adsToUse.push(mockAds[Math.floor(Math.random() * mockAds.length)]);
        }
        return adsToUse;
    }

    getNextAd(currentAdTitle = null) {
        if (mockAds.length === 0) return null;
        if (mockAds.length === 1) return mockAds[0];
        const availableAds = currentAdTitle ? mockAds.filter(ad => ad.title !== currentAdTitle) : mockAds;
        if (availableAds.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableAds.length);
            return availableAds[randomIndex];
        } else {
            return mockAds.find(ad => ad.title === currentAdTitle) || mockAds[0];
        }
    }
} 