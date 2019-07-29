import { decompress } from './src/'
import { spawn, Thread, Worker } from 'threads'

class LZW {
    constructor (numWorkers) {
        this.pool = spawn(new Worker("./src"), numWorkers)
    }
    async decompress (typedArray) {
        return (await this.pool).decompress(typedArray)
    }
}

export {
    decompress,
    LZW
}