# fast-lzw
Extremely fast LZW javascript decompression using WASM

```
import { LZW } from 'fast-lzw'
const WORKER_POOL_SIZE = 4
const lzw = new LZW(WORKER_POOL_SIZE)

// decompress can take an array of ArrayBuffers, or TypedArrays
// it returns an array of Uint8Arrays
const decompressedArrays = await lzw.decompress(compressedArrays)
```
