# fast-lzw
Extremely fast LZW javascript decompression using WASM

```
import { LZW } from 'fast-lzw'
const WORKER_POOL_SIZE = 4

async function decompress(blob) {
  const lzw = new LZW(WORKER_POOL_SIZE)
  const arrayBuffer = await blob.arrayBuffer()
  
  // FastLZW can also take TypedArrays as input, it just
  // gets their ArrayBuffers
  const uint8Arrays = await lzw.decompress(arrayBuffer)
  
  return uint8Arrays.map(_ => _.buffer)
}

```
