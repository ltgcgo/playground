# LinearBeatView
A line, which would turn on each beat. Perfect for showing rhythm and beats.

Inspired by Dancing Line. Made for audio visualizing framework of WebMP 0.30+.

## Used API
### `TimedEvents` API (extends `Array`)
A list of `TimedEvent`.
### `TimedEvent` API
#### `start`
#### `end` (optional)
#### `id` (optional)
#### `data` (optional)
### `CanvasVisualizer` API
#### `.attach(canvasContext)`
#### `.detach()`
#### `.renderOptions`
##### `minFps`
##### `maxFps`
##### `stepFps`
##### `thread`
##### `requiredInfo`
`intensityMono`, `intensityStereo`, `frequencyMono`, `frequencyStereo`, `playbackRate`, `paused`, `timedEvents`
#### `.connectInfo(type, target)`
`analyzerMono`, `analyzerStereoLeft`, `analyzerStereoRight`, `media`, `timedEvents`
#### `.render(canvasContext, audioInfo)`
#### `.startRender()`
#### `.stopRender()`
#### `TimedEvents .timedEvents`