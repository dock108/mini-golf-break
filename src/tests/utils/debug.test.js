/**
 * Unit tests for debug utility
 */

import { debug } from '../../utils/debug';

describe('debug utility', () => {
  let consoleSpy;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      group: jest.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: jest.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      time: jest.spyOn(console, 'time').mockImplementation(() => {}),
      timeEnd: jest.spyOn(console, 'timeEnd').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('debug methods', () => {
    test('should log debug messages', () => {
      debug.log('test message', 'additional data');

      expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG]', 'test message', 'additional data');
    });

    test('should log warning messages', () => {
      debug.warn('warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN]', 'warning message');
    });

    test('should log info messages', () => {
      debug.info('info message', { data: 'test' });

      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO]', 'info message', { data: 'test' });
    });

    test('should always log error messages', () => {
      debug.error('error message', 'error data');

      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR]', 'error message', 'error data');
    });

    test('should create console groups', () => {
      debug.group('Test Group');

      expect(consoleSpy.group).toHaveBeenCalledWith('Test Group');
    });

    test('should end console groups', () => {
      debug.groupEnd();

      expect(consoleSpy.groupEnd).toHaveBeenCalled();
    });

    test('should start timing', () => {
      debug.time('timer-label');

      expect(consoleSpy.time).toHaveBeenCalledWith('timer-label');
    });

    test('should end timing', () => {
      debug.timeEnd('timer-label');

      expect(consoleSpy.timeEnd).toHaveBeenCalledWith('timer-label');
    });

    test('should handle missing console.group gracefully', () => {
      const originalGroup = console.group;
      console.group = undefined;

      expect(() => {
        debug.group('test');
      }).not.toThrow();

      console.group = originalGroup;
    });

    test('should handle missing console.groupEnd gracefully', () => {
      const originalGroupEnd = console.groupEnd;
      console.groupEnd = undefined;

      expect(() => {
        debug.groupEnd();
      }).not.toThrow();

      console.groupEnd = originalGroupEnd;
    });

    test('should handle missing console.time gracefully', () => {
      const originalTime = console.time;
      console.time = undefined;

      expect(() => {
        debug.time('test');
      }).not.toThrow();

      console.time = originalTime;
    });

    test('should handle missing console.timeEnd gracefully', () => {
      const originalTimeEnd = console.timeEnd;
      console.timeEnd = undefined;

      expect(() => {
        debug.timeEnd('test');
      }).not.toThrow();

      console.timeEnd = originalTimeEnd;
    });

    test('should handle multiple error arguments', () => {
      const errorObj = new Error('test error');
      const metadata = { userId: 123, action: 'submit' };

      debug.error('Error occurred', errorObj, metadata);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR]',
        'Error occurred',
        errorObj,
        metadata
      );
    });

    test('should handle no arguments', () => {
      expect(() => {
        debug.log();
        debug.warn();
        debug.error();
        debug.info();
      }).not.toThrow();
    });

    test('should handle null and undefined arguments', () => {
      expect(() => {
        debug.log(null, undefined);
        debug.warn(null);
        debug.error(undefined);
        debug.info(null, undefined);
      }).not.toThrow();
    });

    test('should handle complex objects', () => {
      const complexObj = {
        nested: { data: [1, 2, 3] },
        func: () => 'test',
        date: new Date()
      };

      expect(() => {
        debug.log('Complex object:', complexObj);
      }).not.toThrow();
    });
  });
});
