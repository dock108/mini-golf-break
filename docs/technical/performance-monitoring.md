# Performance Monitoring System

The Mini Golf Break game includes a dedicated performance monitoring system implemented through the `PerformanceManager` class. This system provides real-time tracking, visualization, and analysis of key performance metrics to help identify bottlenecks and optimize gameplay.

## Key Features

- **Real-Time Metrics Tracking**: Continuously monitors FPS, frame times, and component-specific performance
- **Visual Performance Display**: Toggleable overlay showing current performance stats
- **Performance Breakdown**: Detailed timing for physics, rendering, and game subsystems
- **Memory Usage Monitoring**: Tracks JavaScript memory usage and object counts
- **Performance Budgets**: Configurable thresholds with automated warnings when exceeded
- **Historical Data**: Maintains rolling averages and performance history for trend analysis

## Metrics Tracked

### Frame Rates and Timing
- **FPS**: Current, average, minimum, and maximum frame rates
- **Frame Time**: Time taken to process each frame (ms)
- **Frame Time Stability**: Variation in frame times

### Component Timing
- **Physics Time**: Time spent on physics calculations per frame
- **Render Time**: Time spent rendering the scene
- **Ball Update Time**: Time spent updating the ball position and state
- **Visual Effects Time**: Time spent on particle effects and visual enhancements
- **Camera Update Time**: Time spent updating the camera position and movement

### Memory Usage
- **JavaScript Heap Size**: Total and used JavaScript memory (when available)
- **Object Counts**: Number of Three.js objects and physics bodies

## Using the Performance Monitor

### Toggling the Display

Press the `p` key during gameplay to toggle the performance display. When enabled, a panel will appear in the top-right corner showing real-time performance metrics.

### Interpreting the Display

The display shows:
- Current FPS with color coding (green when good, red when below target)
- Frame time with color coding
- Component timing breakdowns
- Memory usage
- Object counts

### Performance Budgets

The system defines performance budgets for key metrics:
- Minimum acceptable FPS: 30
- Maximum acceptable frame time: 33.33ms
- Maximum acceptable physics time: 10ms
- Maximum acceptable render time: 15ms

When these budgets are exceeded, warnings will be logged to the console and to the debug manager.

## Integration with Existing Systems

The `PerformanceManager` integrates with:

1. **GameLoopManager**: For frame timing
2. **DebugManager**: For logging performance warnings and issues
3. **UIManager**: For sharing performance data with the debug display

## For Developers

### Adding Custom Performance Markers

You can easily add timing for specific code sections:

```javascript
// Start timing a section
this.game.performanceManager.startTimer('customFeature');

// Your code here
// ...

// End timing and record the result
this.game.performanceManager.endTimer('customFeature');
```

### Accessing Performance Data Programmatically

The performance data can be accessed via:

```javascript
const performanceData = this.game.performanceManager.getPerformanceData();
console.log(`Current FPS: ${performanceData.fps.current}`);
```

### Configuring the Performance Monitor

The `PERFORMANCE_CONFIG` object in `PerformanceManager.js` allows you to customize:
- Default enabled state
- Toggle key
- Sample size for averages
- Display update frequency
- Warning thresholds

## Technical Details

### Implementation Approach

The `PerformanceManager` uses high-precision timing via the `performance.now()` API to measure elapsed time for various operations. It implements a marker-based timing system that minimizes overhead during gameplay.

For memory tracking, it uses the Chrome-specific `performance.memory` API when available, falling back to object counting for broader compatibility.

### Overhead Considerations

The performance monitoring system is designed to have minimal impact on game performance:

1. Uses efficient timing methods with negligible overhead
2. Updates the visual display only periodically (default: every 500ms)
3. Uses circular buffers with fixed size for historical data
4. Can be completely disabled when not needed

## Future Enhancements

Planned improvements for the performance monitoring system include:

1. **Performance Recording**: Ability to record and export performance data for offline analysis
2. **Performance Profiling**: More detailed breakdown of specific functions and methods
3. **Automated Testing**: Integration with automated performance regression testing
4. **Mobile Optimization**: Specific monitoring for mobile device performance
5. **Expanded Memory Profiling**: More detailed tracking of memory usage patterns 