/**
 * Check if the ball is in a hole
 */
isInHole() {
    // Check distance to hole position
    if (!this.currentHolePosition) return false;
    
    const ballPosition = new THREE.Vector3();
    this.mesh.getWorldPosition(ballPosition);
    
    const distanceToHole = ballPosition.distanceTo(this.currentHolePosition);
    const isNearHole = distanceToHole < 0.25; // Slightly smaller than hole radius for better detection
    
    // Also check if ball is at rest or nearly at rest
    const isAtRest = this.body.velocity.length() < 0.1;
    
    return isNearHole && isAtRest;
}

/**
 * Reset the ball to the tee position for a specific hole
 */
resetBallForHole(holeIndex, startPosition) {
    // Store the target hole position
    this.currentHoleIndex = holeIndex;
    this.currentHolePosition = new THREE.Vector3(0, 0, 0); // Default hole position
    
    // Clear any forces and velocities
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    
    // Reset position to the starting position for this hole
    if (startPosition) {
        this.body.position.copy(startPosition);
        // Add a small height offset to prevent ground collision issues on start
        this.body.position.y = 0.2; 
    }
    
    // Reset the mesh position to match physics body
    this.mesh.position.copy(this.body.position);
    
    // Reset shot count
    this.shotCount = 0;
    
    // Reset movement state
    this.isMoving = false;
    this.hasBeenHit = false;
    
    // Reset scoring for the hole
    this.scoreForCurrentHole = 0;
    
    // Update ball material to default
    this.mesh.material = this.defaultMaterial;
}

/**
 * Handle when ball goes in hole
 */
handleHoleSuccess() {
    // Play success sound or animation
    console.log('Ball in hole!');
    
    // Change ball material to show success
    this.mesh.material = this.successMaterial;
    
    // Emit event for game logic to handle
    if (this.onHoleComplete) {
        this.onHoleComplete(this.currentHoleIndex, this.shotCount);
    }
    
    // Freeze the ball in place
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    
    // Ball will be reset when next hole is loaded
} 