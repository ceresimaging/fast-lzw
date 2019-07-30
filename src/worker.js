import { expose, Transfer } from 'threads/worker'
import { decompress } from './index'

expose({
  decompress: async (_) => {
    const typedArray = await decompress(_)
    return Transfer(typedArray, [typedArray.buffer])
  }
})