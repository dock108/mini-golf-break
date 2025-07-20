// Export all obstacle classes
export { Obstacle } from './Obstacle';
export { ObstacleRegistry, obstacleRegistry } from './ObstacleRegistry';
export { ObstacleFactory } from './ObstacleFactory';
export { TeleporterPad } from './TeleporterPad';
export { SpeedBoostStrip } from './SpeedBoostStrip';
export { MovingPlatform } from './MovingPlatform';
export { RotatingBarrier } from './RotatingBarrier';
export { GravityWell } from './GravityWell';
export { ForceField } from './ForceField';

// Import obstacle types for registration
import { TeleporterPad } from './TeleporterPad';
import { SpeedBoostStrip } from './SpeedBoostStrip';
import { MovingPlatform } from './MovingPlatform';
import { RotatingBarrier } from './RotatingBarrier';
import { GravityWell } from './GravityWell';
import { ForceField } from './ForceField';
import { obstacleRegistry } from './ObstacleRegistry';

// Register all obstacle types
obstacleRegistry.register('teleporter', TeleporterPad);
obstacleRegistry.register('speedboost', SpeedBoostStrip);
obstacleRegistry.register('movingplatform', MovingPlatform);
obstacleRegistry.register('rotatingbarrier', RotatingBarrier);
obstacleRegistry.register('gravitywell', GravityWell);
obstacleRegistry.register('forcefield', ForceField);
