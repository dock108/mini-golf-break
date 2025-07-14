/**
 * Unit tests for physics utilities
 */

// Mock dependencies first, before imports
jest.mock('three', () => ({
  Vector3: jest.fn((x, y, z) => ({ x, y, z })),
  Quaternion: jest.fn((x, y, z, w) => ({ x, y, z, w }))
}));
jest.mock('cannon-es', () => ({
  Vec3: jest.fn((x, y, z) => ({
    x,
    y,
    z,
    length: jest.fn(() => Math.sqrt(x * x + y * y + z * z)),
    dot: jest.fn(function (other) {
      return this.x * other.x + this.y * other.y + this.z * other.z;
    })
  })),
  Quaternion: jest.fn((x, y, z, w) => ({ x, y, z, w })),
  Body: jest.fn(() => ({
    addShape: jest.fn(),
    position: { copy: jest.fn() },
    quaternion: { copy: jest.fn() }
  })),
  Sphere: jest.fn(radius => ({ radius })),
  Box: jest.fn(halfExtents => ({ halfExtents }))
}));

import * as physicsUtils from '../../physics/utils';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

describe('physics utils', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  describe('vector conversions', () => {
    describe('threeToCannonVec3', () => {
      test('should convert THREE.Vector3 to CANNON.Vec3', () => {
        const threeVector = new THREE.Vector3(1, 2, 3);

        const cannonVector = physicsUtils.threeToCannonVec3(threeVector);

        expect(CANNON.Vec3).toHaveBeenCalledWith(1, 2, 3);
        expect(cannonVector).toMatchObject({ x: 1, y: 2, z: 3 });
      });

      test('should handle zero vector', () => {
        const threeVector = new THREE.Vector3(0, 0, 0);

        const cannonVector = physicsUtils.threeToCannonVec3(threeVector);

        expect(CANNON.Vec3).toHaveBeenCalledWith(0, 0, 0);
        expect(cannonVector).toMatchObject({ x: 0, y: 0, z: 0 });
      });

      test('should handle negative values', () => {
        const threeVector = new THREE.Vector3(-5, -10, -15);

        const cannonVector = physicsUtils.threeToCannonVec3(threeVector);

        expect(CANNON.Vec3).toHaveBeenCalledWith(-5, -10, -15);
      });
    });

    describe('cannonToThreeVec3', () => {
      test('should convert CANNON.Vec3 to THREE.Vector3', () => {
        const cannonVector = new CANNON.Vec3(4, 5, 6);

        const threeVector = physicsUtils.cannonToThreeVec3(cannonVector);

        expect(THREE.Vector3).toHaveBeenCalledWith(4, 5, 6);
        expect(threeVector).toMatchObject({ x: 4, y: 5, z: 6 });
      });

      test('should handle large values', () => {
        const cannonVector = new CANNON.Vec3(1000, 2000, 3000);

        const threeVector = physicsUtils.cannonToThreeVec3(cannonVector);

        expect(THREE.Vector3).toHaveBeenCalledWith(1000, 2000, 3000);
      });
    });
  });

  describe('quaternion conversions', () => {
    describe('threeToCannonQuaternion', () => {
      test('should convert THREE.Quaternion to CANNON.Quaternion', () => {
        const threeQuat = new THREE.Quaternion(0, 0, 0, 1);

        const cannonQuat = physicsUtils.threeToCannonQuaternion(threeQuat);

        expect(CANNON.Quaternion).toHaveBeenCalledWith(0, 0, 0, 1);
        expect(cannonQuat).toMatchObject({ x: 0, y: 0, z: 0, w: 1 });
      });

      test('should handle rotation quaternion', () => {
        const threeQuat = new THREE.Quaternion(0.5, 0.5, 0.5, 0.5);

        const cannonQuat = physicsUtils.threeToCannonQuaternion(threeQuat);

        expect(CANNON.Quaternion).toHaveBeenCalledWith(0.5, 0.5, 0.5, 0.5);
      });
    });

    describe('cannonToThreeQuaternion', () => {
      test('should convert CANNON.Quaternion to THREE.Quaternion', () => {
        const cannonQuat = new CANNON.Quaternion(0.1, 0.2, 0.3, 0.9);

        const threeQuat = physicsUtils.cannonToThreeQuaternion(cannonQuat);

        expect(THREE.Quaternion).toHaveBeenCalledWith(0.1, 0.2, 0.3, 0.9);
        expect(threeQuat).toMatchObject({ x: 0.1, y: 0.2, z: 0.3, w: 0.9 });
      });
    });
  });

  describe('physics calculations', () => {
    describe('calculateVelocityMagnitude', () => {
      test('should calculate velocity magnitude', () => {
        const velocity = { x: 3, y: 4, z: 0 };

        const magnitude = physicsUtils.calculateVelocityMagnitude(velocity);

        expect(magnitude).toBe(5); // 3-4-5 triangle
      });

      test('should handle zero velocity', () => {
        const velocity = { x: 0, y: 0, z: 0 };

        const magnitude = physicsUtils.calculateVelocityMagnitude(velocity);

        expect(magnitude).toBe(0);
      });

      test('should handle 3D velocity', () => {
        const velocity = { x: 2, y: 3, z: 6 };

        const magnitude = physicsUtils.calculateVelocityMagnitude(velocity);

        expect(magnitude).toBe(7); // sqrt(4 + 9 + 36) = 7
      });
    });

    describe('isBodyAtRest', () => {
      test('should detect body at rest', () => {
        const body = {
          velocity: { x: 0.001, y: 0.001, z: 0.001 },
          angularVelocity: { x: 0.001, y: 0.001, z: 0.001 }
        };

        const atRest = physicsUtils.isBodyAtRest(body);

        expect(atRest).toBe(true);
      });

      test('should detect moving body', () => {
        const body = {
          velocity: { x: 1, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 }
        };

        const atRest = physicsUtils.isBodyAtRest(body);

        expect(atRest).toBe(false);
      });

      test('should detect rotating body', () => {
        const body = {
          velocity: { x: 0, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 1, z: 0 }
        };

        const atRest = physicsUtils.isBodyAtRest(body);

        expect(atRest).toBe(false);
      });

      test('should use custom threshold', () => {
        const body = {
          velocity: { x: 0.5, y: 0, z: 0 },
          angularVelocity: { x: 0, y: 0, z: 0 }
        };

        const atRestDefault = physicsUtils.isBodyAtRest(body);
        const atRestCustom = physicsUtils.isBodyAtRest(body, 1.0);

        expect(atRestDefault).toBe(false);
        expect(atRestCustom).toBe(true);
      });
    });
  });

  describe('physics helpers', () => {
    describe('applyImpulse', () => {
      test('should apply impulse to body', () => {
        const body = {
          applyImpulse: jest.fn()
        };
        const impulse = new CANNON.Vec3(10, 0, 0);
        const worldPoint = new CANNON.Vec3(0, 0, 0);

        physicsUtils.applyImpulse(body, impulse, worldPoint);

        expect(body.applyImpulse).toHaveBeenCalledWith(impulse, worldPoint);
      });

      test('should apply impulse at body center if no point specified', () => {
        const body = {
          position: new CANNON.Vec3(5, 5, 5),
          applyImpulse: jest.fn()
        };
        const impulse = new CANNON.Vec3(0, 10, 0);

        physicsUtils.applyImpulse(body, impulse);

        expect(body.applyImpulse).toHaveBeenCalledWith(impulse, body.position);
      });
    });

    describe('createPhysicsBody', () => {
      test('should create sphere body', () => {
        const options = {
          type: 'sphere',
          radius: 0.5,
          mass: 1,
          position: new CANNON.Vec3(0, 1, 0)
        };

        const body = physicsUtils.createPhysicsBody(options);

        expect(CANNON.Sphere).toHaveBeenCalledWith(0.5);
        expect(CANNON.Body).toHaveBeenCalledWith({
          mass: 1,
          shape: expect.any(Object)
        });
        expect(body.position.copy).toHaveBeenCalledWith(options.position);
      });

      test('should create box body', () => {
        const options = {
          type: 'box',
          size: new CANNON.Vec3(1, 1, 1),
          mass: 10
        };

        const body = physicsUtils.createPhysicsBody(options);

        expect(CANNON.Box).toHaveBeenCalledWith(options.size);
        expect(CANNON.Body).toHaveBeenCalledWith({
          mass: 10,
          shape: expect.any(Object)
        });
      });
    });
  });

  describe('hole physics', () => {
    describe('calculateImpactAngle', () => {
      test('should calculate direct hit angle', () => {
        const ballVelocity = new CANNON.Vec3(1, 0, 0);
        const holePosition = new CANNON.Vec3(2, 0, 0);
        const ballPosition = new CANNON.Vec3(0, 0, 0);

        const angle = physicsUtils.calculateImpactAngle(ballVelocity, holePosition, ballPosition);

        expect(angle).toBe(0); // Moving directly towards hole = 0 degrees
      });

      test('should calculate perpendicular angle', () => {
        const ballVelocity = new CANNON.Vec3(0, 0, 1);
        const holePosition = new CANNON.Vec3(1, 0, 0);
        const ballPosition = new CANNON.Vec3(0, 0, 0);

        const angle = physicsUtils.calculateImpactAngle(ballVelocity, holePosition, ballPosition);

        expect(angle).toBe(90); // Perpendicular movement = 90 degrees
      });

      test('should handle zero velocity', () => {
        const ballVelocity = new CANNON.Vec3(0, 0, 0);
        const holePosition = new CANNON.Vec3(1, 0, 0);
        const ballPosition = new CANNON.Vec3(0, 0, 0);

        const angle = physicsUtils.calculateImpactAngle(ballVelocity, holePosition, ballPosition);

        expect(angle).toBe(180); // Zero velocity = direct drop
      });

      test('should handle ball at hole center', () => {
        const ballVelocity = new CANNON.Vec3(1, 0, 0);
        const holePosition = new CANNON.Vec3(0, 0, 0);
        const ballPosition = new CANNON.Vec3(0, 0, 0);

        const angle = physicsUtils.calculateImpactAngle(ballVelocity, holePosition, ballPosition);

        expect(angle).toBe(180); // Ball at hole center
      });

      test('should ignore vertical components', () => {
        const ballVelocity = new CANNON.Vec3(1, 10, 0); // High Y velocity
        const holePosition = new CANNON.Vec3(2, 5, 0);
        const ballPosition = new CANNON.Vec3(0, 0, 0);

        const angle = physicsUtils.calculateImpactAngle(ballVelocity, holePosition, ballPosition);

        expect(angle).toBe(0); // Y components ignored, still direct hit
      });
    });

    describe('isLipOut', () => {
      const defaultThresholds = {
        LIP_OUT_SPEED_THRESHOLD: 2.0,
        LIP_OUT_ANGLE_THRESHOLD: 45
      };

      test('should detect lip-out with fast and glancing hit', () => {
        const speed = 3.0;
        const angleDeg = 30;

        const lipOut = physicsUtils.isLipOut(speed, angleDeg, defaultThresholds);

        expect(lipOut).toBe(true);
      });

      test('should not lip-out with slow speed', () => {
        const speed = 1.0;
        const angleDeg = 30;

        const lipOut = physicsUtils.isLipOut(speed, angleDeg, defaultThresholds);

        expect(lipOut).toBe(false);
      });

      test('should not lip-out with direct hit angle', () => {
        const speed = 3.0;
        const angleDeg = 170; // Direct hit

        const lipOut = physicsUtils.isLipOut(speed, angleDeg, defaultThresholds);

        expect(lipOut).toBe(false);
      });

      test('should not lip-out with moderate conditions', () => {
        const speed = 1.5;
        const angleDeg = 60;

        const lipOut = physicsUtils.isLipOut(speed, angleDeg, defaultThresholds);

        expect(lipOut).toBe(false);
      });
    });

    describe('checkHoleEntry', () => {
      const mockBallBody = {
        position: { x: 0, y: 0.1, z: 0 },
        velocity: { x: 0, y: 0, z: 0, length: jest.fn(() => 0.5) }
      };

      const mockHoleTriggerBody = {
        position: { x: 0, y: 0, z: 0 },
        shapes: [{ radiusTop: 0.5 }]
      };

      const defaultThresholds = {
        MAX_SAFE_SPEED: 1.0,
        LIP_OUT_SPEED_THRESHOLD: 2.0,
        LIP_OUT_ANGLE_THRESHOLD: 45
      };

      beforeEach(() => {
        // Reset console.log and console.error mocks
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        console.log.mockRestore();
        console.error.mockRestore();
      });

      test('should allow entry for ball within radius and safe speed', () => {
        const ballBody = {
          ...mockBallBody,
          position: { x: 0.2, y: 0.1, z: 0.2 }, // Within radius
          velocity: { x: 0, y: 0, z: 0, length: jest.fn(() => 0.5) } // Safe speed
        };

        const result = physicsUtils.checkHoleEntry(
          ballBody,
          mockHoleTriggerBody,
          defaultThresholds
        );

        expect(result).toBe(true);
      });

      test('should reject entry for ball outside radius', () => {
        const ballBody = {
          ...mockBallBody,
          position: { x: 1.0, y: 0.1, z: 0 }, // Outside radius
          velocity: { x: 0, y: 0, z: 0, length: jest.fn(() => 0.5) }
        };

        const result = physicsUtils.checkHoleEntry(
          ballBody,
          mockHoleTriggerBody,
          defaultThresholds
        );

        expect(result).toBe(false);
      });

      test('should handle missing ball body', () => {
        const result = physicsUtils.checkHoleEntry(null, mockHoleTriggerBody, defaultThresholds);

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[PhysicsUtils.checkHoleEntry] Missing ballBody or holeTriggerBody/shape.'
        );
      });

      test('should handle missing hole trigger body', () => {
        const result = physicsUtils.checkHoleEntry(mockBallBody, null, defaultThresholds);

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[PhysicsUtils.checkHoleEntry] Missing ballBody or holeTriggerBody/shape.'
        );
      });

      test('should handle missing hole shapes', () => {
        const holeTriggerBody = {
          ...mockHoleTriggerBody,
          shapes: []
        };

        const result = physicsUtils.checkHoleEntry(
          mockBallBody,
          holeTriggerBody,
          defaultThresholds
        );

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[PhysicsUtils.checkHoleEntry] Missing ballBody or holeTriggerBody/shape.'
        );
      });

      test('should allow fast direct hit', () => {
        const ballBody = {
          ...mockBallBody,
          position: { x: 0.1, y: 0.1, z: 0.1 }, // Within radius
          velocity: { x: 1, y: 0, z: 0, length: jest.fn(() => 2.5) } // Fast speed
        };

        // Mock calculateImpactAngle to return direct hit
        const spy = jest.spyOn(physicsUtils, 'calculateImpactAngle').mockReturnValue(170);

        const result = physicsUtils.checkHoleEntry(
          ballBody,
          mockHoleTriggerBody,
          defaultThresholds
        );

        expect(result).toBe(true);
        spy.mockRestore();
      });

      test('should reject fast glancing hit (lip-out)', () => {
        const ballBody = {
          ...mockBallBody,
          position: { x: 0.4, y: 0.1, z: 0.1 }, // Near edge of radius (0.5)
          velocity: { x: -3, y: 0, z: 0, length: jest.fn(() => 3) } // Fast speed towards hole
        };

        // Use thresholds that will trigger lip-out
        const strictThresholds = {
          MAX_SAFE_SPEED: 1.0,
          LIP_OUT_SPEED_THRESHOLD: 2.0,
          LIP_OUT_ANGLE_THRESHOLD: 170 // Very high threshold = most hits are glancing
        };

        const result = physicsUtils.checkHoleEntry(ballBody, mockHoleTriggerBody, strictThresholds);

        expect(result).toBe(false);
      });
    });
  });
});
