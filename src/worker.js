import { expose, Transfer } from 'threads/worker'
import { decompressAll } from './index'

export default expose({
  decompressAll: async (_) => {
    const typedArrays = await decompressAll(_)
    return Transfer(typedArrays, typedArrays.map(typedArray => typedArray.buffer))
  },
})