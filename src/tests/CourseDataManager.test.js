import { CourseDataManager } from '../managers/CourseDataManager';

describe('CourseDataManager', () => {
  let courseDataManager;
  let mockGame;

  beforeEach(() => {
    mockGame = {
      debugManager: {
        enabled: false,
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    };

    courseDataManager = new CourseDataManager(mockGame);
  });

  afterEach(() => {
    courseDataManager.cleanup();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(courseDataManager.game).toBe(mockGame);
      expect(courseDataManager.loadedCourses).toBeInstanceOf(Map);
      expect(courseDataManager.coursePacks).toBeInstanceOf(Map);
      expect(courseDataManager.enableCaching).toBe(true);
      expect(courseDataManager.maxCacheSize).toBe(10);
    });

    test('should set hot reload based on debug manager', () => {
      const enabledGame = {
        debugManager: { enabled: true }
      };
      const manager = new CourseDataManager(enabledGame);
      expect(manager.hotReloadEnabled).toBe(true);
    });
  });

  describe('loadCourse', () => {
    test('should load course from object data', async () => {
      const courseData = {
        name: 'Test Course',
        author: 'Test Author',
        description: 'Test Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Test Hole',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          }
        ]
      };

      const result = await courseDataManager.loadCourse(courseData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Course');
      expect(result.totalHoles).toBe(1);
      expect(result.totalPar).toBe(3);
      expect(result.elementsByType.hole).toHaveLength(1);
      expect(result.holes).toBeInstanceOf(Map);
    });

    test('should handle file path loading with fallback', async () => {
      // Mock the _fetchCourseFile method
      courseDataManager._fetchCourseFile = jest.fn().mockResolvedValue(
        JSON.stringify({
          name: 'File Course',
          author: 'File Author',
          description: 'File Description',
          elements: [
            {
              type: 'hole',
              id: 'hole_1',
              name: 'File Hole',
              index: 0,
              position: [0, 0, 0],
              holePosition: [0, 0, -8],
              startPosition: [0, 0, 8],
              par: 4
            }
          ]
        })
      );

      const result = await courseDataManager.loadCourse('test-course.json');

      expect(result).toBeDefined();
      expect(result.name).toBe('File Course');
      expect(result.totalHoles).toBe(1);
      expect(result.totalPar).toBe(4);
    });

    test('should use cache when available', async () => {
      const courseData = {
        name: 'Cached Course',
        author: 'Cache Author',
        description: 'Cache Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Cache Hole',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          }
        ]
      };

      // Load once
      const result1 = await courseDataManager.loadCourse(courseData);
      courseDataManager.cacheCourse('test-course', result1);

      // Load again - should use cache
      const result2 = await courseDataManager.loadCourse('test-course.json');

      expect(result2).toBe(result1);
      expect(courseDataManager.loadedCourses.has('test-course')).toBe(true);
    });
  });

  describe('validateCourseData', () => {
    test('should validate correct course data', () => {
      const validCourse = {
        name: 'Valid Course',
        author: 'Valid Author',
        description: 'Valid Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Valid Hole',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          }
        ]
      };

      expect(() => {
        courseDataManager.validateCourseData(validCourse);
      }).not.toThrow();
    });

    test('should throw error for missing required fields', () => {
      const invalidCourse = {
        name: 'Invalid Course'
        // Missing author, description, elements
      };

      expect(() => {
        courseDataManager.validateCourseData(invalidCourse);
      }).toThrow('Missing required field: author');
    });

    test('should throw error for invalid elements array', () => {
      const invalidCourse = {
        name: 'Invalid Course',
        author: 'Invalid Author',
        description: 'Invalid Description',
        elements: 'not an array'
      };

      expect(() => {
        courseDataManager.validateCourseData(invalidCourse);
      }).toThrow('Course elements must be an array');
    });

    test('should throw error for no holes', () => {
      const invalidCourse = {
        name: 'Invalid Course',
        author: 'Invalid Author',
        description: 'Invalid Description',
        elements: [
          {
            type: 'wall',
            id: 'wall_1'
          }
        ]
      };

      expect(() => {
        courseDataManager.validateCourseData(invalidCourse);
      }).toThrow('Course must contain at least one hole');
    });

    test('should throw error for invalid hole data', () => {
      const invalidCourse = {
        name: 'Invalid Course',
        author: 'Invalid Author',
        description: 'Invalid Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Invalid Hole',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8]
            // Missing par
          }
        ]
      };

      expect(() => {
        courseDataManager.validateCourseData(invalidCourse);
      }).toThrow('Hole 0: Missing required field: par');
    });

    test('should throw error for non-sequential hole indices', () => {
      const invalidCourse = {
        name: 'Invalid Course',
        author: 'Invalid Author',
        description: 'Invalid Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Hole 1',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          },
          {
            type: 'hole',
            id: 'hole_2',
            name: 'Hole 2',
            index: 2, // Should be 1
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          }
        ]
      };

      expect(() => {
        courseDataManager.validateCourseData(invalidCourse);
      }).toThrow('Hole indices must be sequential starting from 0. Missing index: 1');
    });
  });

  describe('validateHoleData', () => {
    test('should validate correct hole data', () => {
      const validHole = {
        type: 'hole',
        id: 'hole_1',
        name: 'Valid Hole',
        index: 0,
        position: [0, 0, 0],
        holePosition: [0, 0, -8],
        startPosition: [0, 0, 8],
        par: 3
      };

      expect(() => {
        courseDataManager.validateHoleData(validHole, 0);
      }).not.toThrow();
    });

    test('should throw error for invalid position array', () => {
      const invalidHole = {
        type: 'hole',
        id: 'hole_1',
        name: 'Invalid Hole',
        index: 0,
        position: [0, 0], // Should have 3 elements
        holePosition: [0, 0, -8],
        startPosition: [0, 0, 8],
        par: 3
      };

      expect(() => {
        courseDataManager.validateHoleData(invalidHole, 0);
      }).toThrow('Hole 0: position must be array of 3 numbers [x, y, z]');
    });

    test('should throw error for invalid par value', () => {
      const invalidHole = {
        type: 'hole',
        id: 'hole_1',
        name: 'Invalid Hole',
        index: 0,
        position: [0, 0, 0],
        holePosition: [0, 0, -8],
        startPosition: [0, 0, 8],
        par: 0 // Should be >= 1
      };

      expect(() => {
        courseDataManager.validateHoleData(invalidHole, 0);
      }).toThrow('Hole 0: par must be number between 1 and 10');
    });

    test('should throw error for invalid index', () => {
      const invalidHole = {
        type: 'hole',
        id: 'hole_1',
        name: 'Invalid Hole',
        index: -1, // Should be >= 0
        position: [0, 0, 0],
        holePosition: [0, 0, -8],
        startPosition: [0, 0, 8],
        par: 3
      };

      expect(() => {
        courseDataManager.validateHoleData(invalidHole, 0);
      }).toThrow('Hole 0: index must be non-negative number');
    });
  });

  describe('processCourseData', () => {
    test('should process course data correctly', () => {
      const courseData = {
        name: 'Test Course',
        author: 'Test Author',
        description: 'Test Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Test Hole',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          },
          {
            type: 'hole',
            id: 'hole_2',
            name: 'Test Hole 2',
            index: 1,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 4
          },
          {
            type: 'wall',
            id: 'wall_1',
            position: [0, 0, 0]
          }
        ]
      };

      const processed = courseDataManager.processCourseData(courseData);

      expect(processed.totalHoles).toBe(2);
      expect(processed.totalPar).toBe(7);
      expect(processed.loadedAt).toBeDefined();
      expect(processed.elementsByType.hole).toHaveLength(2);
      expect(processed.elementsByType.wall).toHaveLength(1);
      expect(processed.holes).toBeInstanceOf(Map);
      expect(processed.holes.get(0)).toBe(courseData.elements[0]);
      expect(processed.holes.get('hole_1')).toBe(courseData.elements[0]);
      expect(processed.metadata).toBeDefined();
    });

    test('should add default metadata', () => {
      const courseData = {
        name: 'Test Course',
        author: 'Test Author',
        description: 'Test Description',
        elements: [
          {
            type: 'hole',
            id: 'hole_1',
            name: 'Test Hole',
            index: 0,
            position: [0, 0, 0],
            holePosition: [0, 0, -8],
            startPosition: [0, 0, 8],
            par: 3
          }
        ]
      };

      const processed = courseDataManager.processCourseData(courseData);

      expect(processed.metadata.difficulty).toBe('medium');
      expect(processed.metadata.theme).toBe('space');
      expect(processed.metadata.unlockRequirement).toBeNull();
      expect(processed.metadata.environment).toBeDefined();
    });
  });

  describe('cache management', () => {
    test('should cache course data', () => {
      const courseData = { name: 'Test Course' };

      courseDataManager.cacheCourse('test-course', courseData);

      expect(courseDataManager.loadedCourses.get('test-course')).toBe(courseData);
    });

    test('should enforce cache size limit', () => {
      courseDataManager.maxCacheSize = 2;

      courseDataManager.cacheCourse('course1', { name: 'Course 1' });
      courseDataManager.cacheCourse('course2', { name: 'Course 2' });
      courseDataManager.cacheCourse('course3', { name: 'Course 3' });

      expect(courseDataManager.loadedCourses.size).toBe(2);
      expect(courseDataManager.loadedCourses.has('course1')).toBe(false);
      expect(courseDataManager.loadedCourses.has('course2')).toBe(true);
      expect(courseDataManager.loadedCourses.has('course3')).toBe(true);
    });

    test('should clear cache', () => {
      courseDataManager.cacheCourse('course1', { name: 'Course 1' });
      courseDataManager.cacheCourse('course2', { name: 'Course 2' });

      courseDataManager.clearCache();

      expect(courseDataManager.loadedCourses.size).toBe(0);
    });

    test('should clear specific course from cache', () => {
      courseDataManager.cacheCourse('course1', { name: 'Course 1' });
      courseDataManager.cacheCourse('course2', { name: 'Course 2' });

      courseDataManager.clearCache('course1');

      expect(courseDataManager.loadedCourses.size).toBe(1);
      expect(courseDataManager.loadedCourses.has('course1')).toBe(false);
      expect(courseDataManager.loadedCourses.has('course2')).toBe(true);
    });
  });

  describe('getCourseIdFromPath', () => {
    test('should extract course ID from file path', () => {
      expect(courseDataManager.getCourseIdFromPath('path/to/course.json')).toBe('course');
      expect(courseDataManager.getCourseIdFromPath('/absolute/path/to/course.json')).toBe('course');
      expect(courseDataManager.getCourseIdFromPath('course.json')).toBe('course');
    });
  });

  describe('loadCoursePack', () => {
    test('should load course pack successfully', async () => {
      // Mock the _fetchCourseFile method
      courseDataManager._fetchCourseFile = jest
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            id: 'test-pack',
            name: 'Test Pack',
            courses: ['course1.json', 'course2.json']
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            name: 'Course 1',
            author: 'Author 1',
            description: 'Description 1',
            elements: [
              {
                type: 'hole',
                id: 'hole_1',
                name: 'Hole 1',
                index: 0,
                position: [0, 0, 0],
                holePosition: [0, 0, -8],
                startPosition: [0, 0, 8],
                par: 3
              }
            ]
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            name: 'Course 2',
            author: 'Author 2',
            description: 'Description 2',
            elements: [
              {
                type: 'hole',
                id: 'hole_1',
                name: 'Hole 1',
                index: 0,
                position: [0, 0, 0],
                holePosition: [0, 0, -8],
                startPosition: [0, 0, 8],
                par: 4
              }
            ]
          })
        );

      const result = await courseDataManager.loadCoursePack('test-pack.json');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-pack');
      expect(result.name).toBe('Test Pack');
      expect(result.loadedCourses).toHaveLength(2);
      expect(result.totalHoles).toBe(2);
      expect(result.totalPar).toBe(7);
    });

    test('should throw error for invalid course pack', async () => {
      courseDataManager._fetchCourseFile = jest.fn().mockResolvedValue(
        JSON.stringify({
          name: 'Invalid Pack'
          // Missing id and courses
        })
      );

      await expect(courseDataManager.loadCoursePack('invalid-pack.json')).rejects.toThrow(
        'Invalid course pack structure'
      );
    });
  });

  describe('cleanup', () => {
    test('should cleanup all resources', () => {
      courseDataManager.cacheCourse('course1', { name: 'Course 1' });
      courseDataManager.coursePacks.set('pack1', { name: 'Pack 1' });
      courseDataManager.watchedFiles.add('file1.json');

      courseDataManager.cleanup();

      expect(courseDataManager.loadedCourses.size).toBe(0);
      expect(courseDataManager.coursePacks.size).toBe(0);
      expect(courseDataManager.watchedFiles.size).toBe(0);
    });
  });
});
