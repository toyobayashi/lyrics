import { Emitter } from './util.js'

export class Cursor {
  constructor (lrc, enableRuby) {
    this.lrc = lrc
    this._enableRuby = enableRuby
    this.row = 0
    this.col = 0
    this.rubyIndex = 0

    this._onDidChange = new Emitter()
    this.onDidChange = this._onDidChange.event

    this._onDidEnableRubyChange = new Emitter()
    this.onDidEnableRubyChange = this._onDidEnableRubyChange.event
  }

  reset () {
    const changed = this.row !== 0 || this.col !== 0 || this.rubyIndex !== 0
    this.row = 0
    this.col = 0
    this.rubyIndex = 0
    if (changed) this._onDidChange.fire(this)
  }

  set (row, col, rubyIndex) {
    const changed = this.row !== row || this.col !== col || this.rubyIndex !== rubyIndex
    this.row = row
    this.col = col
    this.rubyIndex = rubyIndex
    if (changed) this._onDidChange.fire(this)
  }

  get enableRuby () {
    return this._enableRuby
  }

  set enableRuby (enableRuby) {
    const changed = this._enableRuby !== enableRuby
    this._enableRuby = enableRuby
    if (changed) this._onDidEnableRubyChange.fire(enableRuby)
    if (!enableRuby && this.rubyIndex !== 0) {
      this.rubyIndex = 0
      this._onDidChange.fire(this)
    }
  }

  getBlocks () {
    const b = this.lrc.data[this.row][this.col]
    return {
      block: b,
      ruby: (this._enableRuby && b.ruby) ? b.ruby[this.rubyIndex] : null
    }
  }

  getBlock () {
    const { block, ruby } = this.getBlocks()
    return ruby || block
  }

  up () {
    if (this.row > 0) {
      this.row--
      this.col = Math.min(this.col, this.lrc.data[this.row].length - 1)
      this._onDidChange.fire(this)
      return true
    }
    return false
  }

  down () {
    const data = this.lrc.data
    if (this.row < data.length - 1) {
      this.row++
      this.col = Math.min(this.col, data[this.row].length - 1)
      this._onDidChange.fire(this)
      return true
    }
    return false
  }

  left () {
    const data = this.lrc.data
    const block = data[this.row][this.col]

    const backCol = () => {
      if (this.col > 0) {
        this.col--
        if (this._enableRuby) {
          const currentBlock = data[this.row][this.col]
          if (currentBlock.ruby) {
            this.rubyIndex = currentBlock.ruby.length - 1
          }
        }
        this._onDidChange.fire(this)
        return true
      } else if (this.row > 0) {
        this.row--
        this.col = data[this.row].length - 1
        this.rubyIndex = 0
        this._onDidChange.fire(this)
        return true
      }
      return false
    }

    if (this._enableRuby && block.ruby) {
      if (this.rubyIndex > 0) {
        this.rubyIndex--
        this._onDidChange.fire(this)
        return true
      } else {
        return backCol()
      }
    } else {
      return backCol()
    }
  }

  right () {
    const data = this.lrc.data
    const block = data[this.row][this.col]

    const nextCol = () => {
      if (this.col < data[this.row].length - 1) {
        this.col++
        this.rubyIndex = 0
        this._onDidChange.fire(this)
        return true
      } else if (this.row < data.length - 1) {
        this.row++
        this.col = 0
        this.rubyIndex = 0
        this._onDidChange.fire(this)
        return true
      }
      return false
    }

    if (this._enableRuby && block.ruby) {
      if (this.rubyIndex < block.ruby.length - 1) {
        this.rubyIndex++
        this._onDidChange.fire(this)
        return true
      } else {
        return nextCol()
      }
    } else {
      return nextCol()
    }
  }
}
