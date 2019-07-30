import { expose, Transfer } from 'threads/worker'
import { decompress } from './index'

expose({
  decompress: (_) => Transfer(decompress(_))
})