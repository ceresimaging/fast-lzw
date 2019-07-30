import { decompress } from './src/'
import { spawn, Pool, Worker, Transfer } from 'threads'

class LZW {
  constructor (numWorkers) {
    this.pool = Pool(
      () => spawn(new Worker("./src/worker"), numWorkers)
    )
  }
  async decompress (typedArray) {
    const pool = await this.pool
    
    let data
    if (typedArray.buffer instanceof SharedArrayBuffer) {
      data = typedArray
    } else {
      // If this isn't a shared array buffer underneath, it
      // might be MUCH larger than the typedArray, so lets
      // do a performance tradeoff and make a copy
      const copy = new Uint8Array(typedArray.byteLength)
      copy.set(typedArray)
      data = Transfer(copy, [copy.buffer])
    }

    return await pool.queue(
      async worker => await worker.decompress(data)
    )
  }
}
  
export {
  decompress,
  LZW
}