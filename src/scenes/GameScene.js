/**
 * Set up the scene
 */
setupScene() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Set space-like background
    this.scene.background = new THREE.Color(0x000000); // Black background
    
    // Add some random stars
    this.createStarField();
    
    // Set up lighting
    this.setupLighting();
    
    // Set up shadow properties
    this.setupShadows();
    
    // Set up the renderer
    this.setupRenderer();
    
    // Set up the camera
    this.setupCamera();
    
    // Initialize the event listeners
    this.initEventListeners();
    
    return this.scene;
}

/**
 * Create a starfield in the background
 */
createStarField() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        sizeAttenuation: true
    });
    
    const starsVertices = [];
    const starsCount = 2000;
    
    // Create stars randomly positioned in a sphere around the scene
    for (let i = 0; i < starsCount; i++) {
        // Generate random positions in a large sphere around the scene
        const x = THREE.MathUtils.randFloatSpread(200);
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        
        // Push vertices
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
}

/**
 * Set up the lighting for the scene
 */
setupLighting() {
    // Add ambient light
    this.ambientLight = new THREE.AmbientLight(0x333333, 0.6);
    this.scene.add(this.ambientLight);
    
    // Add directional light (like sunlight)
    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    this.directionalLight.position.set(50, 50, 50);
    this.scene.add(this.directionalLight);
    
    // Add a gentle blue point light to simulate space glow
    this.blueLight = new THREE.PointLight(0x4444FF, 0.6, 100);
    this.blueLight.position.set(20, 20, -20);
    this.scene.add(this.blueLight);
    
    // Add a gentle purple point light for contrast
    this.purpleLight = new THREE.PointLight(0xCC44FF, 0.4, 100);
    this.purpleLight.position.set(-20, 15, 20);
    this.scene.add(this.purpleLight);
}

// ... existing code ... 