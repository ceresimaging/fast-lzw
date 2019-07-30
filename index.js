import { decompress, decompressAll } from './src/'
import { spawn, Pool, Worker, Transfer } from 'threads'

class LZW {
  constructor (numWorkers, outputBuffer) {
    this.outputBuffer= outputBuffer
    this.usingWorkers = numWorkers > 0
    if (this.usingWorkers > 0) {
      this.pool = Pool(
        () => spawn(new Worker("./src/worker"), numWorkers)
      )  
    } else {
      this.pool = null
    }
  }
  prepareDataForTransfer (typedArrays) {
    const transfers = []
    return Transfer(
      typedArrays.map(function (typedArray) {
        if (typedArray.buffer instanceof SharedArrayBuffer) {
          return typedArray
        } else {
          if (typedArray.byteLength != typedArray.buffer.byteLength) {
            // If the typedArray doesn't span the buffer, lets play it safe and make a copy
            typedArray = typedArray.slice()
          }
          transfers.push(typedArray.buffer)
          return typedArray
        }
      }), 
      transfers
    )
  }
  async decompress(typedArrays) {
    if (!this.pool) {
      return await decompressAll(typedArrays, this.outputBuffer)
    } else {
      const data = this.prepareDataForTransfer(typedArrays)
      const pool = await this.pool
      return await pool.queue(
        async worker => await worker.decompressAll(data)
      )
    }
  }
}
  
export {
  decompress,
  decompressAll,
  LZW
}