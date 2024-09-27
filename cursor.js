export class Cursor {
  constructor (lrc, enableRuby) {
    this.lrc = lrc
    this._enableRuby = enableRuby
    this.row = 0
    this.col = 0
    this.rubyIndex = 0
  }

  setEnableRuby (enableRuby) {
    this._enableRuby = enableRuby
    if (!enableRuby) {
      this.rubyIndex = 0
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
      return true
    }
    return false
  }

  down () {
    const data = this.lrc.data
    if (this.row < data.length - 1) {
      this.row++
      this.col = Math.min(this.col, data[this.row].length - 1)
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
        return true
      } else if (this.row > 0) {
        this.row--
        this.col = data[this.row].length - 1
        this.rubyIndex = 0
        return true
      }
      return false
    }

    if (this._enableRuby && block.ruby) {
      if (this.rubyIndex > 0) {
        this.rubyIndex--
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
        return true
      } else if (this.row < data.length - 1) {
        this.row++
        this.col = 0
        this.rubyIndex = 0
        return true
      }
      return false
    }

    if (this._enableRuby && block.ruby) {
      if (this.rubyIndex < block.ruby.length - 1) {
        this.rubyIndex++
        return true
      } else {
        return nextCol()
      }
    } else {
      return nextCol()
    }
  }
}
