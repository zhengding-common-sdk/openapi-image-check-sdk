/* eslint-disable */
import { findIndex } from 'lodash'

export default class LimitQueueUtil {
  constructor({ limit, queues } = {}) {
    this.queues = queues || []
    this.setLimit(limit)
  }

  promises = []
  init() {
    const idle = this.limit - this.promises.length
    if (idle > 0) {
      this.queues.splice(0, idle).map(this.execute)
    }
  }
  execute = async (queue) => {
    if (typeof queue !== 'function') return this.init()
    if (this.promises.length >= this.limit) return this.queues.unshift(queue)

    const promise = queue()
    this.promises.push(promise)
    try {
      await promise
    } catch {}
    const index = findIndex(this.promises, promise)
    this.promises.splice(index, 1)

    this.limit > this.promises.length && this.execute(this.queues.shift())
  }

  add(...queues) {
    this.queues.push(...queues)
    this.init()
  }
  concat(queues, cb) {
    this.queues = this.queues.concat(queues)
    if(cb) {
      cb(this.queues)
    }
    setTimeout(() => {
      this.init()
    })
  }
  setLimit(limit) {
    this.limit = limit || 8
    this.init()
  }
}
