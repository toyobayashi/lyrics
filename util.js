export class DisposableStore {
  constructor () {
    this._toDispose = new Set()
  }

  dispose () {
    this._toDispose.forEach((d) => d.dispose())
    this._toDispose.clear()
  }

  add (d) {
    this._toDispose.add(d)
    return d
  }
}

export class Disaposable {
  static None = Object.freeze({ dispose: () => {} })

  constructor () {
    this._store = new DisposableStore()
  }

  dispose () {
    this._store.dispose()
  }

  /**
   * @template {{ dispose: () => void }} T
   * @param {T} o 
   * @returns {T}
   */
  _register (o) {
    if (o === this) {
      throw new Error('Cannot register a disposable on itself!')
    }

    return this._store.add(o)
  }
}

/**
 * @template T
 */
export class Emitter {
  constructor () {
    this._disposed = false
    this._event = undefined
    this._listeners = []
  }

  dispose () {
    if (!this._disposed) {
      this._disposed = true
      this._listeners = undefined
    }
  }

  /**
   * @returns {(callback: (e: T) => any, thisArgs?: any, disposables?: DisposableStore | DisposableStore[]) => { dispose: () => void }}
   */
  get event () {
    if (!this._event) {
      this._event = (callback, thisArgs, disposables) => {
        if (this._disposed) {
          return Disaposable.None
        }

        if (thisArgs) {
          callback = callback.bind(thisArgs)
        }

        const wrap = { value: callback }

        this._listeners.push(wrap)

        const result = {
          dispose: () => {
            if (!this._listeners) {
              return
            }
            const idx = this._listeners.indexOf(wrap)
            if (idx !== -1) {
              this._listeners.splice(idx, 1)
            }
          }
        }

        if (disposables instanceof DisposableStore) {
          disposables.add(result)
        } else if (Array.isArray(disposables)) {
          disposables.push(result)
        }

        return result
      }
    }
    return this._event
  }

  hasListeners () {
    return this._listeners ? this._listeners.length > 0 : false
  }

  /**
   * @param {T} event
   */
  fire (event) {
    if (!this._listeners) {
      return
    }

    const errors = []
    this._listeners.forEach((l) => {
      try {
        l.value(event)
      } catch (error) {
        errors.push(error)
      }
    })
    if (errors.length > 0) {
      console.warn('Errors while firing events', errors)
    }
  }
}

/**
 * @template {Node} T 
 */
export class Component extends Disaposable {
  /**
   * @param {Node} container 
   * @param {T} domNode 
   */
  constructor (domNode) {
    super()
    this._disposed = false
    /** @type {T} */
    this.domNode = domNode
  }

  /**
   * @template {EventTarget} Target
   * @template {keyof HTMLElementEventMap} K
   * @param {Target} node 
   * @param {Target extends HTMLElement ? K : Parameters<Target['addEventListener']>[0]} type 
   * @param {Target extends HTMLElement ? ((this: Target, ev: HTMLElementEventMap[K]) => any) : Parameters<Target['addEventListener']>[1]} listener 
   * @param {Parameters<Target['addEventListener']>[2]=} options 
   * @returns {{ dispose: () => void }}
   */
  _addEventListener (node, type, listener, options) {
    node.addEventListener(type, listener, options)
    const disposable = {
      dispose: () => node.removeEventListener(type, listener, options)
    }
    this._register(disposable)
    return disposable
  }

  dispose () {
    if (this._disposed) return
    this._disposed = true
    super.dispose()
    // const domNode = this.domNode
    this._domNode = null
  }
}
