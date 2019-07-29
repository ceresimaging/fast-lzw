import { decompress } from './src/'
import { spawn, Pool, Worker, Transfer } from 'threads'

class LZW {
  constructor (numWorkers) {
    this.pool = Pool(
      () => spawn(new Worker("./src"), numWorkers)
    )
  }
  async decompress (typedArray) {
    const pool = await this.pool
    return await pool.queue(
      async worker => worker.decompress(
        Transfer(typedArray)
      )
    )
  }
}
  
export {
  decompress,
  LZW
}