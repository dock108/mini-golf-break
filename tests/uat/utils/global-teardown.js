/**
 * Global teardown for UAT tests
 * Runs once after all tests complete
 */

async function globalTeardown() {
  console.log('[Global Teardown] Starting UAT test environment cleanup...');
  
  try {
    // Clean up any test artifacts
    const fs = require('fs').promises;
    const path = require('path');
    
    // Clean up old debug screenshots (keep only last 10)
    const screenshotsDir = path.join(__dirname, '../screenshots');
    
    try {
      const files = await fs.readdir(screenshotsDir);
      const debugFiles = files
        .filter(file => file.startsWith('debug-initialization-failure-'))
        .map(file => {
          // More robust timestamp extraction with validation
          const match = file.match(/^debug-initialization-failure-(\d+)\.png$/);
          const timestamp = match ? parseInt(match[1], 10) : null;
          
          return {
            name: file,
            path: path.join(screenshotsDir, file),
            time: timestamp
          };
        })
        .filter(file => file.time !== null) // Skip files with invalid timestamps
        .sort((a, b) => b.time - a.time);
      
      // Keep only the 10 most recent debug screenshots
      if (debugFiles.length > 10) {
        const filesToDelete = debugFiles.slice(10);
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            console.log(`[Global Teardown] Cleaned up old debug screenshot: ${file.name}`);
          } catch (error) {
            // Ignore file deletion errors
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      console.log('[Global Teardown] Screenshot cleanup skipped (directory may not exist)');
    }
    
    // Log test completion
    console.log('[Global Teardown] UAT test environment cleanup complete');
    
  } catch (error) {
    console.error('[Global Teardown] Cleanup failed:', error.message);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

module.exports = globalTeardown;