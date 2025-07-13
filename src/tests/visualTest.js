/**
 * Visual Test for Mini Golf Break
 *
 * This script contains simple visual tests to ensure the hole layout, ball appearance, and
 * tee position are rendered correctly.
 *
 * To run this test:
 * 1. Include it in the main Game.js file
 * 2. Call testHoleVisuals() from the init() method
 */

export function testHoleVisuals(game) {
  console.log('==== Running Visual Test Suite ====');

  // Test 1: Check ball color is white
  const isBallWhite =
    game.ball &&
    game.ball.mesh &&
    game.ball.mesh.material &&
    game.ball.mesh.material.color.getHex() === 0xffffff;

  console.log(`Test 1 - Ball is white: ${isBallWhite ? 'PASS' : 'FAIL'}`);

  // Test 2: Check ball is positioned on tee
  const ballPosition = new THREE.Vector3();
  game.ball.mesh.getWorldPosition(ballPosition);

  const startPosition = game.course.getHoleStartPosition(game.currentHole);
  const isOnTee =
    startPosition &&
    Math.abs(ballPosition.x - startPosition.x) < 0.1 &&
    Math.abs(ballPosition.z - startPosition.z) < 0.1;

  console.log(`Test 2 - Ball is on tee: ${isOnTee ? 'PASS' : 'FAIL'}`);

  // Test 3: Check hole enclosure has minimal walls (between 3-4 walls)
  const wallCount = game.course.obstacles.filter(obj => {
    // Rough check for walls based on typical wall dimensions
    const boundingBox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    return size.y > 0.5 && size.y < 0.7; // Wall height is typically 0.6
  }).length;

  console.log(
    `Test 3 - Minimal wall count (3-4): ${wallCount >= 3 && wallCount <= 4 ? 'PASS' : 'FAIL'}, Count: ${wallCount}`
  );

  // Test 4: Verify tee marker exists and has correct components
  const teeMarkers = game.scene.children.filter(
    obj => obj.userData && obj.userData.type === 'teeMarker'
  );

  const hasTeeMarker = teeMarkers.length > 0;
  console.log(`Test 4 - Tee marker exists: ${hasTeeMarker ? 'PASS' : 'FAIL'}`);

  console.log('==== Visual Test Suite Complete ====');
}
