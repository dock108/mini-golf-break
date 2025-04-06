import * as THREE from 'three';
import { AdShip } from './AdShip';
import { mockAds } from './adConfig';

/**
 * Manages the lifecycle, placement, and updates for all AdShip instances.
 */
export class AdShipManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = "AdShipsContainer";
        this.ships = [];
        this.isInitialized = false;

        // TODO: Configurable parameters
        this.maxShips = 3;
        this.spawnInterval = 15; // seconds
        this.timeSinceLastSpawn = 0;
    }

    init() {
        if (this.isInitialized) return;
        console.log("Initializing AdShipManager...");

        // Add the main container group to the scene
        // This should be done by the main game/scene manager
        // this.scene.add(this.group);

        // Initial spawn (example)
        this.spawnInitialShips();

        this.isInitialized = true;
        console.log("AdShipManager Initialized.");
    }

    spawnInitialShips() {
        // Spawn a few ships based on mockAds for testing
        for (let i = 0; i < Math.min(mockAds.length, this.maxShips); i++) {
            this.spawnShip(mockAds[i]);
        }
    }

    spawnShip(adData) {
        if (this.ships.length >= this.maxShips) {
            // Optionally recycle oldest ship instead of just returning
            // console.warn("Max ad ships reached.");
            return;
        }

        try {
            const ship = new AdShip(adData);
            this.ships.push(ship);
            this.group.add(ship.group);

            // TODO: Set initial position/path for the ship
            // Example: random position beneath the course area
            const x = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 30;
            // Temporarily set Y higher for visibility
            ship.group.position.set(x, -1, z); // <-- Temporary Y position for testing

            console.log(`Spawned AdShip: ${adData.title}`);

        } catch (error) {
            console.error(`Error spawning ship for ad: ${adData.title}`, error);
        }
    }

    update(deltaTime) {
        if (!this.isInitialized) return;

        // Update individual ship animations/logic
        this.ships.forEach(ship => {
            ship.update(deltaTime);
            // TODO: Implement movement logic (e.g., simple orbit, path following)
            // Example: Slow drift
             ship.group.position.x += 0.5 * deltaTime;
             if (ship.group.position.x > 25) {
                 ship.group.position.x = -25;
             }
        });

        // Spawn new ships periodically
        this.timeSinceLastSpawn += deltaTime;
        if (this.timeSinceLastSpawn >= this.spawnInterval) {
            this.timeSinceLastSpawn = 0;
            // TODO: Implement logic to select next ad from config/queue
            // const nextAd = this.getNextAd();
            // if (nextAd) this.spawnShip(nextAd);
        }

        // TODO: Implement ship despawning/recycling when out of bounds or expired
    }

    cleanup() {
        console.log("Cleaning up AdShipManager...");
        this.ships.forEach(ship => {
            ship.dispose();
            this.group.remove(ship.group);
        });
        this.ships = [];

        // Remove the main group from the scene if it was added
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        this.isInitialized = false;
        console.log("AdShipManager Cleaned up.");
    }

    // --- Helper methods (Example) ---
    getNextAd() {
        // Simple example: pick a random ad from mockAds
        if (mockAds.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * mockAds.length);
        return mockAds[randomIndex];
    }
} 