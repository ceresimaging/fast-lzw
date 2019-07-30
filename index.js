import { decompress, decompressAll } from './src/'
import { spawn, Pool, Worker, Transfer } from 'threads'

class LZW {
  constructor (numWorkers) {
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
    return typedArrays.map(function (typedArray) {
      if (typedArray.buffer instanceof SharedArrayBuffer) {
        return typedArray
      } else {
        // If this isn't a shared array buffer underneath, it
        // might be MUCH larger than the typedArray, so lets
        // do a performance tradeoff and make a copy
        const copy = typedArray.slice()
        return Transfer(copy, [copy.buffer])
      }
    })
  }
  async decompress(typedArrays) {
    if (!this.pool) {
      console.log("not using pool")
      return await decompressAll(typedArrays)
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