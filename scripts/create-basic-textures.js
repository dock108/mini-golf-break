/**
 * Create basic single-pixel placeholder textures
 * This provides fallback textures for the MaterialManager
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../public/assets/textures');

// Create a minimal JPEG-like file (actually just a placeholder)
function createPlaceholderTexture(color, name) {
  // Create a minimal data buffer representing the color
  // This won't be a real image, but it will prevent 404 errors
  const data = Buffer.from(`PLACEHOLDER_${color}_${name}`, 'utf8');
  return data;
}

// Generate all required textures
function generatePlaceholders() {
  try {
    console.log('Creating basic placeholder texture files...');
    
    // Grass textures
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grass/diffuse.jpg'), createPlaceholderTexture('green', 'grass_diffuse'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grass/normal.jpg'), createPlaceholderTexture('normal', 'grass_normal'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grass/roughness.jpg'), createPlaceholderTexture('rough', 'grass_rough'));
    
    // Metal textures
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/diffuse.jpg'), createPlaceholderTexture('gray', 'metal_diffuse'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/normal.jpg'), createPlaceholderTexture('normal', 'metal_normal'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/roughness.jpg'), createPlaceholderTexture('smooth', 'metal_rough'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/metalness.jpg'), createPlaceholderTexture('metallic', 'metal_metalness'));
    
    // Tech wall textures
    fs.writeFileSync(path.join(OUTPUT_DIR, 'tech_wall/diffuse.jpg'), createPlaceholderTexture('tech', 'tech_diffuse'));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'tech_wall/normal.jpg'), createPlaceholderTexture('normal', 'tech_normal'));
    
    console.log('✅ Basic placeholder texture files created!');
    console.log('Note: These are placeholder files. For real textures, consider:');
    console.log('  1. Installing canvas module: npm install canvas');
    console.log('  2. Using external texture generation tools');
    console.log('  3. Downloading high-quality PBR texture packs');
    
  } catch (error) {
    console.error('❌ Error creating placeholder files:', error);
    process.exit(1);
  }
}

generatePlaceholders();