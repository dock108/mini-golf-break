/**
 * Generate placeholder textures for the MaterialManager
 * This script creates basic procedural textures to prevent loading errors
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const OUTPUT_DIR = path.join(__dirname, '../public/assets/textures');

// Create a grass diffuse texture
function createGrassTexture() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  // Base green color
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add grass blade texture
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const length = 3 + Math.random() * 5;
    const width = 0.5 + Math.random() * 1;
    
    ctx.strokeStyle = `hsl(${120 + Math.random() * 20}, ${60 + Math.random() * 20}%, ${30 + Math.random() * 20}%)`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y - length);
    ctx.stroke();
  }
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create a grass normal map
function createGrassNormal() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  // Base normal (flat surface)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add subtle normal variation
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 2 + Math.random() * 4;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, '#9090ff');
    gradient.addColorStop(1, '#7070ff');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create a grass roughness map
function createGrassRoughness() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  // Base roughness (medium)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add roughness variation
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 1 + Math.random() * 3;
    const brightness = 100 + Math.random() * 100;
    
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create a metal diffuse texture
function createMetalTexture() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  // Base metallic color
  ctx.fillStyle = '#666666';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add brushed metal lines
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * 512;
    const opacity = 0.1 + Math.random() * 0.3;
    const brightness = 100 + Math.random() * 100;
    
    ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${opacity})`;
    ctx.lineWidth = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create a tech wall diffuse texture
function createTechWallTexture() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  // Base tech color
  ctx.fillStyle = '#444444';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add tech panel lines
  const panelSize = 64;
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  
  for (let x = 0; x <= 512; x += panelSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  
  for (let y = 0; y <= 512; y += panelSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  
  // Add corner details
  for (let x = panelSize; x < 512; x += panelSize) {
    for (let y = panelSize; y < 512; y += panelSize) {
      ctx.fillStyle = '#555555';
      ctx.fillRect(x - 4, y - 4, 8, 8);
    }
  }
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create generic normal map
function createGenericNormal() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create generic roughness map
function createGenericRoughness() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Create metalness map
function createMetalness() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);
  
  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Generate all textures
async function generateTextures() {
  try {
    console.log('Generating placeholder textures...');
    
    // Grass textures
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grass/diffuse.jpg'), createGrassTexture());
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grass/normal.jpg'), createGrassNormal());
    fs.writeFileSync(path.join(OUTPUT_DIR, 'grass/roughness.jpg'), createGrassRoughness());
    
    // Metal textures
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/diffuse.jpg'), createMetalTexture());
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/normal.jpg'), createGenericNormal());
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/roughness.jpg'), createGenericRoughness());
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metal/metalness.jpg'), createMetalness());
    
    // Tech wall textures
    fs.writeFileSync(path.join(OUTPUT_DIR, 'tech_wall/diffuse.jpg'), createTechWallTexture());
    fs.writeFileSync(path.join(OUTPUT_DIR, 'tech_wall/normal.jpg'), createGenericNormal());
    
    console.log('✅ Placeholder textures generated successfully!');
    console.log('Generated textures:');
    console.log('  - grass/diffuse.jpg, normal.jpg, roughness.jpg');
    console.log('  - metal/diffuse.jpg, normal.jpg, roughness.jpg, metalness.jpg');
    console.log('  - tech_wall/diffuse.jpg, normal.jpg');
    
  } catch (error) {
    console.error('❌ Error generating textures:', error);
    process.exit(1);
  }
}

// Check if canvas is available
try {
  require('canvas');
  generateTextures();
} catch (error) {
  console.log('⚠️  Canvas module not available. Creating simple placeholder files instead...');
  
  // Create empty placeholder files
  const placeholders = [
    'grass/diffuse.jpg', 'grass/normal.jpg', 'grass/roughness.jpg',
    'metal/diffuse.jpg', 'metal/normal.jpg', 'metal/roughness.jpg', 'metal/metalness.jpg',
    'tech_wall/diffuse.jpg', 'tech_wall/normal.jpg'
  ];
  
  placeholders.forEach(file => {
    const filePath = path.join(OUTPUT_DIR, file);
    fs.writeFileSync(filePath, Buffer.from('placeholder'), 'binary');
  });
  
  console.log('✅ Placeholder files created (install canvas for proper textures)');
}