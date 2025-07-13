import { StateManager } from '../managers/StateManager';
import { GameState } from '../states/GameState';

describe('StateManager', () => {
  let stateManager;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      eventManager: {
        publish: jest.fn()
      }
    };

    stateManager = new StateManager(mockGame);
  });

  test('should initialize with correct default state', () => {
    expect(stateManager.state.currentGameState).toBe(GameState.INITIALIZING);
    expect(stateManager.state.ballInMotion).toBe(false);
    expect(stateManager.state.holeCompleted).toBe(false);
  });

  test('should change game state correctly', () => {
    stateManager.setGameState(GameState.AIMING);
    expect(stateManager.state.currentGameState).toBe(GameState.AIMING);
  });

  test('should handle ball motion state', () => {
    expect(stateManager.isBallInMotion()).toBe(false);

    stateManager.setBallInMotion(true);
    expect(stateManager.isBallInMotion()).toBe(true);
  });

  test('should handle hole completion state', () => {
    expect(stateManager.isHoleCompleted()).toBe(false);

    stateManager.setHoleCompleted(true);
    expect(stateManager.isHoleCompleted()).toBe(true);
  });

  test('should handle reset ball state', () => {
    stateManager.setResetBall(true);
    expect(stateManager.shouldResetBall()).toBe(true);

    stateManager.clearResetBall();
    expect(stateManager.shouldResetBall()).toBe(false);
  });

  test('should handle debug mode toggle', () => {
    expect(stateManager.isDebugMode()).toBe(false);

    stateManager.toggleDebugMode();
    expect(stateManager.isDebugMode()).toBe(true);

    stateManager.toggleDebugMode();
    expect(stateManager.isDebugMode()).toBe(false);
  });
});
