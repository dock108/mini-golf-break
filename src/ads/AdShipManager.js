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
        this.maxShips = 4; // Exactly 4 ships, one per level
        // Define 4 distinct vertical levels
        this.verticalLevels = [-5, -15, -25, -35]; // Adjusted starting level to -5
        // Collision avoidance config removed - no longer needed
        // this.shipSafetyRadius = 10.0; 
        // this.slowdownFactor = 0.5; 
        // this.slowdownDuration = 2.5;
        
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

        // Calculate bounds once
        this.minBound = -this.movementAreaSize / 2 - this.boundaryBuffer;
        this.maxBound = this.movementAreaSize / 2 + this.boundaryBuffer;
    }

    init() {
        console.log("[AdShipManager.init] Starting...");
        if (this.isInitialized) {
             console.log("[AdShipManager.init] Already initialized, returning.");
             return;
        }
        console.log("[AdShipManager.init] Spawning initial ships...");
        try {
             this.spawnInitialShips();
        } catch (error) {
            console.error("[AdShipManager.init] Error during spawnInitialShips:", error);
            this.isInitialized = false;
            return;
        }
        this.isInitialized = true;
        console.log(`[AdShipManager.init] Initialized with ${this.ships.length} ships.`);
    }

    spawnInitialShips() {
        console.log(`[AdShipManager.spawnInitialShips] Spawning initial ${this.maxShips} ships...`);
        
        if (this.maxShips !== 4) {
            console.warn(`[AdShipManager.spawnInitialShips] maxShips is currently ${this.maxShips}, but this setup requires exactly 4. Adjusting...`);
            this.maxShips = 4;
        }

        const initialAds = this.getInitialAds(this.maxShips);
        console.log(`[AdShipManager.spawnInitialShips] Got ${initialAds.length} initial ads.`);
        if (!initialAds || initialAds.length < this.maxShips) {
            console.warn("[AdShipManager.spawnInitialShips] Not enough initial ads found to spawn 4 ships.");
            // Potentially fill remaining slots with random ads if needed
             while (initialAds.length < this.maxShips && mockAds.length > 0) {
                 initialAds.push(mockAds[Math.floor(Math.random() * mockAds.length)]);
             }
             if(initialAds.length < this.maxShips){
                console.error("[AdShipManager.spawnInitialShips] FATAL: Still not enough ads after trying random. Aborting spawn.");
                return; // Or handle error appropriately
             }
        }

        const createdShips = [];
        for (let i = 0; i < this.maxShips; i++) {
            const adData = initialAds[i];
            try {
                // Create ship but don't finalize position/orientation yet
                const ship = this.spawnShip(adData, null);
                if (ship) {
                    createdShips.push(ship);
                } else {
                    console.error(`[AdShipManager.spawnInitialShips] Failed to create ship for ad: ${adData?.title}`);
                }
            } catch (error) {
                console.error(`[AdShipManager.spawnInitialShips] Error spawning ship for ad ${adData?.title}:`, error);
            }
        }

        // Separate ships by movement type
        const linearShips = createdShips.filter(ship => ship.movementType === 'linear');
        const orbitalShips = createdShips.filter(ship => ship.movementType === 'orbit');

        // Assign levels, prioritizing linear for the highest level (-5)
        const availableLevels = [...this.verticalLevels]; // Copy the levels array
        
        linearShips.forEach(ship => {
            let assignedLevel;
            if (availableLevels.includes(-5)) {
                assignedLevel = -5;
                availableLevels.splice(availableLevels.indexOf(-5), 1); // Remove -5
            } else if (availableLevels.length > 0) {
                assignedLevel = availableLevels.shift(); // Take the next highest available
            } else {
                 console.error(`[AdShipManager.spawnInitialShips] Ran out of levels assigning to linear ship: ${ship.adData.title}`);
                 assignedLevel = -50; // Fallback, should not happen with 4 ships/4 levels
            }
            ship.verticalOffset = assignedLevel;
            ship.group.position.y = assignedLevel;
             this._orientShip(ship); // Finalize orientation now that Y is set
            console.log(` -> Assigned LEVEL ${assignedLevel} to LINEAR ship: ${ship.adData.title}`);
        });

        orbitalShips.forEach(ship => {
            if (availableLevels.length > 0) {
                const assignedLevel = availableLevels.shift(); // Take the next highest available
                ship.verticalOffset = assignedLevel;
                ship.group.position.y = assignedLevel;
                 this._orientShip(ship); // Finalize orientation now that Y is set
                console.log(` -> Assigned LEVEL ${assignedLevel} to ORBITAL ship: ${ship.adData.title}`);
            } else {
                console.error(`[AdShipManager.spawnInitialShips] Ran out of levels assigning to orbital ship: ${ship.adData.title}`);
                 ship.verticalOffset = -50; // Fallback
                 ship.group.position.y = -50;
                 this._orientShip(ship);
            }
        });

        console.log("[AdShipManager.spawnInitialShips] Finished spawning and level assignment.");
    }

    spawnShip(adData, forceType = null) {
        if (!adData) {
            console.warn("[AdShipManager] Tried to spawn ship with null adData.");
            return null;
        }

        try {
            // Determine ship type: Use forced type or random fallback
            const shipType = forceType || ['nasa', 'alien', 'station'][Math.floor(Math.random() * 3)];
            console.log(`[AdShipManager.spawnShip] Spawning ship. Forced type: ${forceType}, Actual type: ${shipType}`);

            const ship = new AdShip(adData, shipType);
             // Vertical offset and Y position will be set later in spawnInitialShips
             // ship.verticalOffset = assignedLevel !== null ? assignedLevel : this.verticalLevels[0]; 
            this.ships.push(ship);
            this.group.add(ship.group);

            // --- Collision Avoidance State Removed ---
            // ship.isSlowedDown = false;
            // ship.slowdownTimer = 0;

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

                // Initial position near center for orbiters - Y set later
                const initialRadius = Math.random() * (this.movementAreaSize / 3);
                const initialAngle = Math.random() * Math.PI * 2;
                const initialX = initialRadius * Math.cos(initialAngle);
                const initialZ = initialRadius * Math.sin(initialAngle);
                ship.group.position.set(initialX, 0, initialZ); // Temp Y=0

            } else { // 'nasa' or 'alien'
                ship.movementType = 'linear';
                const startPosVel = this._getLinearStartPosAndVel();
                ship.group.position.set(startPosVel.position.x, 0, startPosVel.position.z); // Temp Y=0
                ship.velocity = startPosVel.velocity;
            }

            // --- Common Setup --- 
            // Orientation will be set after Y position is finalized
            // this._orientShip(ship);
            ship.group.scale.set(4, 4, 4); // Apply scale

            console.log(`Created AdShip: ${adData.title} type ${ship.shipType} mode: ${ship.movementType}`);
            return ship; // Return the created ship object

        } catch (error) {
            console.error(`Error creating ship for ad: ${adData.title}`, error);
            return null;
        }
    }

    /** Gets a starting position just outside bounds and a velocity pointing across */
    _getLinearStartPosAndVel() {
        const position = new THREE.Vector3();
        const velocity = new THREE.Vector3();
        
        // For the highest level (-5), we only want to use edges 0 and 1 (left-right paths)
        // that pass behind the hole (viewed from the tee)
        // The tee is typically at the -Z position, and the hole at +Z, so we want
        // ships to pass along the +Z edge (behind the hole from player perspective)
        
        let edge;
        if (this.ships.length > 0) {
            // Check if this will be assigned to -5 vertical level
            const isForTopLevel = this.ships.some(ship => ship.verticalOffset === -5);
            
            if (isForTopLevel) {
                // For -5 level ships, always use paths along +Z (behind hole)
                edge = Math.random() < 0.5 ? 0 : 1; // 0: +X edge to -X, 1: -X edge to +X
                
                // Use a more restricted Z position range that's further back (higher Z)
                const behindHoleZ = Math.random() * 10 + 30; // Z range from +30 to +40
                position.z = behindHoleZ;
            } else {
                // For other levels, prevent starting near the tee (edge 3: -Z)
                edge = Math.floor(Math.random() * 3); // Choose only from edges 0, 1, or 2
                const randPosAlongEdge = (Math.random() - 0.5) * this.movementAreaSize;
                
                switch (edge) {
                    case 0: // Start at +X edge, move -X
                    case 1: // Start at -X edge, move +X
                        position.z = randPosAlongEdge;
                        break;
                    case 2: // Start at +Z edge, move -Z
                        position.x = randPosAlongEdge;
                        break;
                }
            }
        } else {
            // If no ships exist yet (initial setup), also prevent edge 3
            edge = Math.floor(Math.random() * 3); // Choose only from 0, 1, 2
            const randPosAlongEdge = (Math.random() - 0.5) * this.movementAreaSize;
            
            switch (edge) {
                case 0: // Start at +X edge, move -X
                case 1: // Start at -X edge, move +X
                    position.z = randPosAlongEdge;
                    break;
                case 2: // Start at +Z edge, move -Z
                    position.x = randPosAlongEdge;
                    break;
            }
        }

        // Set X position for edges 0 and 1
        if (edge === 0) position.x = this.maxBound - 1;
        if (edge === 1) position.x = this.minBound + 1;
        
        // Set Z position for edges 2 and 3
        if (edge === 2) position.z = this.maxBound - 1;
        if (edge === 3) position.z = this.minBound + 1;
        
        // Set velocity based on edge
        switch (edge) {
            case 0: // Start at +X edge, move -X
                velocity.set(-this.linearShipSpeed, 0, 0);
                break;
            case 1: // Start at -X edge, move +X
                velocity.set(this.linearShipSpeed, 0, 0);
                break;
            case 2: // Start at +Z edge, move -Z
                velocity.set(0, 0, -this.linearShipSpeed);
                break;
            case 3: // Start at -Z edge, move +Z
                velocity.set(0, 0, this.linearShipSpeed);
                break;
        }
        
        // Add a slight random variance to the path
        if (edge === 0 || edge === 1) {
            velocity.z = (Math.random() - 0.5) * 0.1 * this.linearShipSpeed;
        } else {
            velocity.x = (Math.random() - 0.5) * 0.1 * this.linearShipSpeed;
        }
        
        velocity.normalize().multiplyScalar(this.linearShipSpeed);
        return { position, velocity };
    }

     _orientShip(ship) {
        if (!ship || !ship.group) return;
        const lookAtY = ship.verticalOffset || this.verticalLevels[0]; // Use ship's Y or fallback

        if (ship.movementType === 'orbit') {
            const tangentX = -ship.orbitRadius * Math.sin(ship.orbitAngle) * Math.sign(ship.angularSpeed);
            const tangentZ = ship.orbitRadius * Math.cos(ship.orbitAngle) * Math.sign(ship.angularSpeed);
            ship.group.lookAt(ship.group.position.x + tangentX, lookAtY, ship.group.position.z + tangentZ);
        } else if (ship.movementType === 'linear' && ship.velocity && ship.velocity.lengthSq() > 0.001) {
             const lookAtPos = new THREE.Vector3().copy(ship.group.position).add(ship.velocity);
            ship.group.lookAt(lookAtPos.x, lookAtY, lookAtPos.z);
        }
     }

    update(deltaTime, ballPosition = null) {
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

            let effectiveDeltaTime = deltaTime; // No slowdown adjustment needed
            const currentY = ship.verticalOffset || this.verticalLevels[0]; // Ensure Y is consistent using assigned level

            // --- Collision Avoidance Checks & Logic Removed --- 
            /*
            // --- Handle existing slowdown --- 
            if (ship.isSlowedDown) {
                ship.slowdownTimer -= deltaTime;
                // console.log(`[AdAvoidance] Ship ${ship.adData.title} is slowed. Timer: ${ship.slowdownTimer.toFixed(2)}`); // Log slowdown timer
                if (ship.slowdownTimer <= 0) {
                    ship.isSlowedDown = false;
                    ship.slowdownTimer = 0;
                    // console.log(`[AdAvoidance] Ship ${ship.adData.title} resuming normal speed.`); // Log speed resume
                } else {
                    effectiveDeltaTime *= 0.5; // Use the hardcoded slowdown factor if needed elsewhere, or remove
                }
            }

            // --- Simple O(N^2) Collision Avoidance --- 
            if (!ship.isSlowedDown) { 
                for (let j = i + 1; j < this.ships.length; j++) {
                    const otherShip = this.ships[j];
                    
                    const shipPos = ship.group.position;
                    const otherPos = otherShip.group.position;
                    // console.log(`[AdAvoidance Check] Ship ${i}: (${shipPos.x.toFixed(1)}, ${shipPos.z.toFixed(1)}), Ship ${j}: (${otherPos.x.toFixed(1)}, ${otherPos.z.toFixed(1)})`); // Log positions being checked
                    
                    const distanceSq = shipPos.distanceToSquared(otherPos);
                    
                    // Hardcoded safety radius squared if needed for other logic, or remove
                    const safetyRadiusSq = 10 * 10; 

                    if (distanceSq < safetyRadiusSq) {
                        const distance = Math.sqrt(distanceSq);
                        // console.warn(`[AdAvoidance DETECTED] Ships ${ship.adData.title} (#${i}) and ${otherShip.adData.title} (#${j}) too close!`);
                        // console.log(` -> Distance: ${distance.toFixed(2)} (Limit: 10 units)`);
                        // console.log(` -> Pos Ship ${i}: (${shipPos.x.toFixed(1)}, ${shipPos.y.toFixed(1)}, ${shipPos.z.toFixed(1)})`);
                        // console.log(` -> Pos Ship ${j}: (${otherPos.x.toFixed(1)}, ${otherPos.y.toFixed(1)}, ${otherPos.z.toFixed(1)})`);
                        // const shipVelBefore = ship.velocity ? `(${ship.velocity.x.toFixed(1)},${ship.velocity.z.toFixed(1)})` : 'N/A (Orbit)';
                        // const otherVelBefore = otherShip.velocity ? `(${otherShip.velocity.x.toFixed(1)},${otherShip.velocity.z.toFixed(1)})` : 'N/A (Orbit)';
                        // console.log(` -> Vel Before Ship ${i}: ${shipVelBefore}, Ship ${j}: ${otherVelBefore}`);
                        
                        // --- Apply Mutual Slowdown --- 
                        // console.log(` -> Applying slowdown to BOTH (Duration: 2.5, Factor: 0.5)`);
                        // ship.isSlowedDown = true;
                        // ship.slowdownTimer = 2.5;
                        // otherShip.isSlowedDown = true;
                        // otherShip.slowdownTimer = 2.5; 
                        // effectiveDeltaTime *= 0.5;

                        // --- Apply Velocity Nudge --- 
                        // const nudgeStrength = 0.5; 
                        // const orbitalNudgeFactor = 0.1; // Radians to adjust angle by
                        // const avoidanceVecForShip = new THREE.Vector3().subVectors(shipPos, otherPos).normalize();
                        // const avoidanceVecForOther = avoidanceVecForShip.clone().negate();
                        // let nudgedShipI = false;
                        // let nudgedShipJ = false;

                        // // Nudge Ship i
                        // if (ship.movementType === 'linear' && ship.velocity) {
                        //     ship.velocity.addScaledVector(avoidanceVecForShip, nudgeStrength);
                        //     ship.velocity.normalize().multiplyScalar(this.linearShipSpeed); 
                        //     nudgedShipI = true;
                        // } else if (ship.movementType === 'orbit') {
                        //     // Calculate tangent direction (approximate)
                        //     const tangent = new THREE.Vector3(-Math.sin(ship.orbitAngle), 0, Math.cos(ship.orbitAngle));
                        //     // Determine if nudge should be forward or backward along orbit
                        //     const dot = tangent.dot(avoidanceVecForShip);
                        //     const angleAdjustment = orbitalNudgeFactor * (dot >= 0 ? 1 : -1); // Push away from avoidance vec direction
                        //     ship.orbitAngle += angleAdjustment;
                        //     // console.log(` -> Nudging ORBITAL Ship ${i} angle by ${angleAdjustment.toFixed(3)} rad`);
                        //     nudgedShipI = true;
                        // }

                        // // Nudge Ship j
                        // if (otherShip.movementType === 'linear' && otherShip.velocity) {
                        //     otherShip.velocity.addScaledVector(avoidanceVecForOther, nudgeStrength);
                        //     otherShip.velocity.normalize().multiplyScalar(this.linearShipSpeed);
                        //     nudgedShipJ = true;
                        // } else if (otherShip.movementType === 'orbit') {
                        //     // Calculate tangent direction (approximate)
                        //     const tangent = new THREE.Vector3(-Math.sin(otherShip.orbitAngle), 0, Math.cos(otherShip.orbitAngle));
                        //      // Determine if nudge should be forward or backward along orbit
                        //     const dot = tangent.dot(avoidanceVecForOther);
                        //     const angleAdjustment = orbitalNudgeFactor * (dot >= 0 ? 1 : -1); // Push away from avoidance vec direction
                        //     otherShip.orbitAngle += angleAdjustment;
                        //     // console.log(` -> Nudging ORBITAL Ship ${j} angle by ${angleAdjustment.toFixed(3)} rad`);
                        //     nudgedShipJ = true;
                        // }
                        
                        // // console.log(` -> Nudge Applied: Ship ${i}? ${nudgedShipI}, Ship ${j}? ${nudgedShipJ}`);
                        // const shipVelAfter = ship.velocity ? `(${ship.velocity.x.toFixed(1)},${ship.velocity.z.toFixed(1)})` : 'N/A (Orbit)';
                        // const otherVelAfter = otherShip.velocity ? `(${otherShip.velocity.x.toFixed(1)},${otherShip.velocity.z.toFixed(1)})` : 'N/A (Orbit)';
                        // // console.log(` -> Vel After Ship ${i}: ${shipVelAfter}, Ship ${j}: ${otherVelAfter}`);
                        // --- End Velocity Nudge ---
                        
                        // break; // Exit inner loop after handling one collision pair for this ship
                    }
                }
            }
            */

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

            // --- Update Banner Orientation (Look at Ball) ---
            if (ballPosition && ship.bannerMesh && ship.group) {
                // 1. Make banner look towards the ball's world position
                const targetPosition = ballPosition.clone();
                ship.bannerMesh.lookAt(targetPosition);

                // 2. Apply the local upward tilt *after* lookAt
                // We rotate around the banner's local X-axis
                ship.bannerMesh.rotateX(Math.PI / 8); 
            }

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

                    // Special handling for -5 level ships (closest to the course)
                    let newStart;
                    if (ship.verticalOffset === -5) {
                        // Create a custom path for -5 level ships that ensures they stay behind the hole
                        const customStart = { position: new THREE.Vector3(), velocity: new THREE.Vector3() };
                        
                        // Determine whether to go left-to-right or right-to-left
                        const goLeftToRight = Math.random() < 0.5;
                        
                        if (goLeftToRight) {
                            // Start on the left (-X) side
                            customStart.position.set(this.minBound + 1, ship.verticalOffset, Math.random() * 10 + 30); // +Z behind hole
                            customStart.velocity.set(this.linearShipSpeed, 0, 0); // Move right (+X)
                        } else {
                            // Start on the right (+X) side
                            customStart.position.set(this.maxBound - 1, ship.verticalOffset, Math.random() * 10 + 30); // +Z behind hole
                            customStart.velocity.set(-this.linearShipSpeed, 0, 0); // Move left (-X)
                        }
                        
                        // Add slight randomness to Z velocity component
                        customStart.velocity.z = (Math.random() - 0.5) * 0.1 * this.linearShipSpeed;
                        customStart.velocity.normalize().multiplyScalar(this.linearShipSpeed);
                        
                        newStart = customStart;
                    } else {
                        // For other levels, use the normal recycling logic
                        newStart = this._getLinearStartPosAndVel();
                    }
                    
                    ship.group.position.set(newStart.position.x, ship.verticalOffset, newStart.position.z); // Use existing offset
                    ship.velocity = newStart.velocity;
                    this._orientShip(ship); // Re-orient for new path
                    // Ensure recycled ships aren't slowed - No longer needed
                    // ship.isSlowedDown = false; 
                    // ship.slowdownTimer = 0;
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