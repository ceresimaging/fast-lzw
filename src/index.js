let Module
async function getModule() {
  const loadModule = await import('./lzw-wasm.js')
  if (!Module) {
    const moduleReady = new Promise(function (resolve, reject) {
      Module = {
        onAbort: what => reject(what),
        onRuntimeInitialized: _ => resolve(true)
      }
    })
    loadModule(Module)
    await moduleReady
  }
  return Module
}


function _decompress(typedArray) {
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
  
  return response
}

async function decompress(typedArray) {
  await getModule()
  return _decompress(typedArray)
}

async function decompressAll(typedArrays) {
  await getModule()
  return typedArrays.map(typedArray => _decompress(typedArray))
}

export { decompress, decompressAll }