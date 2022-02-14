## Specification
### `ArchiveProvider`
#### `decompress {Decompressor}`
Registers available low-level decompression algorithms and their APIs.

#### `compress {Compressor}`
Registers available low-level decompression algorithms and their APIs.

### `Decompressor`
#### `name`
Name of the decompressor.

#### `decompress(TypedArray)`
Decompresses the data.
