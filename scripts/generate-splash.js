const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// iOS splash screen sizes
const iosSplashSizes = [
  { width: 2732, height: 2732, name: 'Default@2x~universal~anyany' },
  { width: 1242, height: 2688, name: 'Default-2688h' },
  { width: 1125, height: 2436, name: 'Default-2436h' },
  { width: 1242, height: 2208, name: 'Default-736h' },
  { width: 750, height: 1334, name: 'Default-667h' },
  { width: 640, height: 1136, name: 'Default-568h' }
];

async function generateSplashScreens() {
  const logoPath = path.join(__dirname, '../public/assets/logo.png');
  const outputDir = path.join(__dirname, '../resources/splash');
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Read the logo
  const logo = sharp(logoPath);
  const metadata = await logo.metadata();
  
  console.log(`Original logo size: ${metadata.width}x${metadata.height}`);
  
  for (const size of iosSplashSizes) {
    // Create black background
    const background = sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    });
    
    // Calculate logo size (30% of smallest dimension)
    const logoSize = Math.min(size.width, size.height) * 0.3;
    
    // Resize logo
    const resizedLogo = await sharp(logoPath)
      .resize(Math.round(logoSize), Math.round(logoSize), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    
    // Composite logo on background
    const output = await background
      .composite([{
        input: resizedLogo,
        gravity: 'centre'
      }])
      .png()
      .toFile(path.join(outputDir, `${size.name}.png`));
    
    console.log(`Generated: ${size.name}.png (${size.width}x${size.height})`);
  }
  
  console.log('Splash screens generated successfully!');
}

generateSplashScreens().catch(console.error);