const { chromium } = require('@playwright/test');

async function debugGameLoading() {
  console.log('Starting game loading debug...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`[Page Error] ${error.message}`);
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    console.log(`[Request Failed] ${request.url()} - ${request.failure().errorText}`);
  });
  
  console.log('Navigating to http://localhost:8080...');
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  
  // Wait a bit for any async loading
  await page.waitForTimeout(5000);
  
  // Check page state
  const pageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      hasCanvas: !!document.querySelector('canvas'),
      canvasCount: document.querySelectorAll('canvas').length,
      hasGame: !!window.game,
      gameKeys: window.game ? Object.keys(window.game) : [],
      bodyChildren: Array.from(document.body.children).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className
      })),
      scripts: Array.from(document.scripts).map(s => ({
        src: s.src || 'inline',
        async: s.async,
        defer: s.defer
      })),
      errors: window.errors || []
    };
  });
  
  console.log('Page Info:', JSON.stringify(pageInfo, null, 2));
  
  // Check for Three.js
  const threeInfo = await page.evaluate(() => {
    return {
      hasThree: typeof THREE !== 'undefined',
      threeVersion: typeof THREE !== 'undefined' ? THREE.REVISION : null,
      webGLSupported: !!window.WebGLRenderingContext,
      webGL2Supported: !!window.WebGL2RenderingContext
    };
  });
  
  console.log('Three.js Info:', JSON.stringify(threeInfo, null, 2));
  
  // Check bundle.js
  const bundleInfo = await page.evaluate(() => {
    const script = document.querySelector('script[src*="bundle.js"]');
    return {
      hasBundleScript: !!script,
      bundleSrc: script ? script.src : null,
      bundleLoaded: script ? script.complete !== false : false
    };
  });
  
  console.log('Bundle Info:', JSON.stringify(bundleInfo, null, 2));
  
  // Keep browser open for manual inspection
  console.log('\nBrowser is open for manual inspection. Press Ctrl+C to close.');
  
  // Wait indefinitely
  await new Promise(() => {});
}

debugGameLoading().catch(console.error);