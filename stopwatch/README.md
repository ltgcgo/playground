# WEBSF.main
## Schedule API
### NRange
`NRange` is an interface for expressing a certain numeral range.

#### `NSignal {}`
##### `i`
Cumulative ID of a certain signal.

##### `p`
The exact point of a certain signal.

##### `l`
The label of a certain signal.

##### `c`
The belonging class of a certain signal.

#### `NRange {}`
##### `i`
Cumulative ID of a certain range.
##### `f`
The start point of a certain range.

##### `t`
The end point of a certain range.

##### `l`
The label of a certain range.

##### `c`
The belonging class of a certain range.

##### `@get d`
The duration of a certain range.

##### `@set d`

#### `Ranges {}`
##### `@private list[]`
Sorted list of ranges. Start points are the actual factor for sorting.

##### `@private classes[]`

##### `@get length`

##### `@get duration`

##### `get(start, duration)`

##### `getAll()`

##### `getIn(start, end)`

##### `getClasses()`

##### `getClass(class)`

##### `forEach(callbackFn)`

## Time API
### RTime
`RTime` is an interface for dealing with time values relative to some point. Maximum accuracy is in nanoseconds.

#### `RTime {}`
##### `@static fromSeconds(sec)`
Return a new instance of `RTime` parsed from the given value in seconds.

##### `@static fromMs(sec)`
Return a new instance of `RTime` parsed from the given value in milliseconds.

##### `@static fromSteps(step, time)`
Return a new instance of `RTime` parsed from the given value in steps.

For example, when `step` is set to 200, and `time` is set to 1919810, then the returned instance is an equivilant representation of 9599.05 seconds.

##### `@static fromText(text)`
Parse time in `DD:MM:SS.XXX` or in `DD:MM:SS-F/F` fashion.

##### `@static fromJSON(json)`
Parse time expressed in JSON format.

##### `@static fromObject(object)`
Return a new instance of `RTime` parsed from the given object.
<pre>{
	"d": // in days
	"h": // in hours
	"m": // in minutes
	"s": // in seconds
	"ms": // in milliseconds
	"us": // in microseconds
	"ns": // in nanoseconds
}</pre>

##### `to(optionString)`
Returns an object which contains the parsed time. Every parameter is in integer. The object has the same structure of the required object of `fromObject()` function.
<pre>{
	"d": // in days (require option 'd' to enable)
	"h": // in hours (require option 'h' to enable)
	"m": // in minutes
	"s": // in seconds
	"ms": // in milliseconds
	"us": // in microseconds (require option 'u' to enable)
	"ns": // in nanoseconds (require option 'n' to enable)
}</pre>

#### `toSteps()`
Return time in steps.

##### `toJSON()`
Serialize time into JSON format.

##### `toText(format)`
Serialize time into a human-friendly format. Default format: `01:02`(MM:SS).

* **format**: Serialized formats to choose from.
    * *ms*: Default format (MM:SS)
    * *h* (after "ms"): Defines an 100ms accuracy in the text. (MM:SS.X)
    * *d* (after "ms"): Defines an 10ms accuracy in the text. (MM:SS.XX)
    * *m* (after "ms"): Defines an 1ms accuracy in the text. (MM:SS.XXX)
    * *s* (after "ms"): Include steps. (MM:SS-F/F)
    * *h* (before "ms"): Make the output text to include hours. (HH:MM:SS)
    * *d* (before "ms"): Make the output text to include days and hours. (DD:HH:MM:SS)

For example, with "hmsd" you will get an output of `HH:MM:SS.XX` (`01:14:51.40`), or with "mss" you will get an output of `MM:SS-FF/FFF` (`19:19:81-00/100`, if the instance has a `steps` property and is set to `100`).

### HARTime
`HARTime` is an interface for getting time values with high accuracy. The basic accuracy is in milliseconds (ms), and if the platform supports, the accuracy can go further into microseconds (us) or nanoseconds (ns). Inherited from `RTime`.

#### `HARTime {}`
##### `now()`
Get high resolution time relative to the beginning of its creation in milliseconds.

##### `nowStep(step)`
Get high resolution time relative to the beginning of its creation) in steps. It will never return floating point numbers, thus its value is rounded down.

* **step**: Define how many steps are in a second. For example, if you define it to 50, then 114514 would mean 2290.28 seconds.

##### `nowRT()`
Get high resolution time relative to the beginning of its creation inside a new `RTime` instance.

# WEBSF.ext
## Time API
### Stopwatch
`Stopwatch` is an interface for use of regular time keeping, or for use in some benchmarking/performance testing applications.
#### (dependencies)
* `websf.main@webcirque`

#### `Stopwatch {}`

##### `point()`
Start or resume the current `Stopwatch` instance. If it is resumed, it will return -1, or otherwise the relative time of execution of the function.

##### `pause()`
Pause the current `Stopwatch` instance. Throws an error if already paused.

##### `stop()`
Stop to keep time, and reset to original state.

Returns the total time of the specific instance if it has been successfully reset. Throws an error if failed.

##### `@get sum`
Returns the relative time of execution of the function.

##### `@get count`
Returns the total execution count of `point()` function.

##### `@get mean`
Returns the average time between every execution of `point()` function.

##### `flag()`
Record the time of execution of this function into ```Stopwatch.flags```.

##### `flags`
A list of recorded time. ```Constructed with StopwatchFlag object.```

### OPSStat
`OPStat` is an interface for measuring operation execution frequencies, for example measuring FPS.

#### (dependencies)
* `websf.main@webcirque`

#### `OPSStat {}`
##### `pause()`
Pauses OPSStat. When paused, OPSStat will refuse any operation recording.

##### `point()`
Starts/resumes OPSStat.

##### `add(class)`
Record an operation into a specific class.

##### `@get duration`
Total running duration of OPSStat.

##### `getClass(class)`

##### `getClasses()`

##### `getMean(?class)`

##### `reset()`

##### `maxItems`