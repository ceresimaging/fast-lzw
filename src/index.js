import loadModule from './lzw-wasm.js'
import { expose, Transfer } from 'threads/worker'

let Module
const moduleReady = new Promise(function (resolve, reject) {
  Module = loadModule({
    onAbort: what => reject(what),
    onRuntimeInitialized: _ => resolve(true)
  })
  Module.ready = moduleReady
})

async function decompress(typedArray) {
  await Module.ready
  
  const src = Module._malloc(typedArray.byteLength)
  const heapBytes = new Uint8Array(Module.HEAPU8.buffer, src, typedArray.byteLength)
  heapBytes.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength))
  
  const outSizePtr = Module._malloc(4)
  const outPtr = Module.ccall('lzwDecompress', 'number', ['number', 'number', 'number'], [heapBytes.byteOffset, heapBytes.byteLength, outSizePtr])
  
  const outSize = new Uint32Array(Module.HEAPU8.buffer, outSizePtr, 4)[0]
  
  const out = new Uint8Array(Module.HEAPU8.buffer, outPtr, outSize)
  
  const response = new Uint8Array(outSize)
  response.set(out)
  
  Module._free(outPtr)
  Module._free(outSizePtr)
  
  return out
}

expose({
  decompress: (_) => Transfer(decompress(_))
})

export { decompress }