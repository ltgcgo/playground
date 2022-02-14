## Specification
### `_SpecAgent_ ArchiveProvider`
### `_Specification_`
#### `decompress (rawData, decompressOptions)`
Registers available high-level decompression algorithms and their APIs.

#### `compress (rawData, compressOptions)`
Registers available high-level compression algorithms and their APIs.

### `DecompressOptions`
#### `verify`

### `CompressOptions`
#### `memory`
Specifies memory allocation strategies for supported algorithms.

#### `level`
Specifies compression level for supported algorithms.

#### `window`
Specify window size in bits.

#### `strategy`
Specifies strategy for supported algorithms.
