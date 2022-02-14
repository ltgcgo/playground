## Specification
### `CustomRanges` (`IntRanges`, `FloatRanges`)
#### `length`
Returns the length of sections.

#### `mode`
Defines how should CustomRanges treat the border values. Valid values are 0 to 3.

IntRanges should have this value fixed at 3.

#### `min`
Specify the allowed minimal value. Default to `0`.

#### `max`
Specify the allowed maximum value. Default to `Infinity`.

#### `start(index)`
Returns the starting value of a range.

#### `end(index)`
Returns the ending value of a range.

#### `[Symbol.iterator]`
Returns an object fulfilling the iterator protocol.

#### `forEach(callbackFn([start, end], index, object))`
Quickly iterates through the object.

#### `add(start, end)`
Add a range.

#### `remove(start, end)`
Remove a range.

### `IntRanges`
#### `division`
Specify the accuracy for fixed point values. Must be an integer greater than 0.
