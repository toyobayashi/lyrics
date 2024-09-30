import { Component } from '../util.js'

/**
 * @extends {Component<HTMLDivElement>}
 */
export class LrcArea extends Component {
  constructor (container, globalSettings, cursor) {
    super(document.createElement('div'))
    this.domNode.classList.add('lrc-area')
    container.appendChild(this.domNode)
    this._addEventListener(this.domNode, 'click', (e) => {
      const target = e.target
      if (target.tagName === 'RUBY') {
        if (this.cursor) {
          this.cursor.set(
            Array.prototype.indexOf.call(target.parentElement.parentElement.children, target.parentElement),
            Array.prototype.indexOf.call(target.parentElement.children, target),
            0
          )
          this.restartCursorTimer()
        }
      } else if (target.tagName === 'RT') {
        const rubyElement = target.parentElement
        if (this.cursor) {
          this.cursor.set(
            Array.prototype.indexOf.call(rubyElement.parentElement.parentElement.children, rubyElement.parentElement),
            Array.prototype.indexOf.call(rubyElement.parentElement.children, rubyElement),
            0
          )
          this.restartCursorTimer()
        }
      } else if (target.tagName === 'SPAN') {
        const rubyElement = target.parentElement.parentElement
        if (this.cursor) {
          this.cursor.set(
            Array.prototype.indexOf.call(rubyElement.parentElement.parentElement.children, rubyElement.parentElement),
            Array.prototype.indexOf.call(rubyElement.parentElement.children, rubyElement),
            this.cursor.enableRuby ? Array.prototype.indexOf.call(target.parentElement.children, target) : 0
          )
          this.restartCursorTimer()
        }
      }/*  else {
        this.clearCursorStyle()
        this._cursorCurrent = null
      } */
    })

    this.globalSettings = globalSettings
    /** @type {import('../cursor.js').Cursor} */
    this.cursor = cursor
    this._cursorTimer = 0
    this._cursorCurrent = null
    this._cursorCallback = () => {
      if (!this._cursorCurrent || this.cursor.lrc.data.length === 0) return
      this.renderCursorElement()
      this._cursorTimer = setTimeout(this._cursorCallback, 500)
    }

    this._register(cursor.onDidChange(this.onDidCursorChange, this))
  }

  dispose () {
    super.dispose()
    this.cursor = null
    this.globalSettings = null
    clearTimeout(this._cursorTimer)
    this._cursorCurrent = null
  }

  onDidCursorChange () {
    this.restartCursorTimer()
    const { blockEl } = this.getCursorElements()
    const scrollTop = blockEl.offsetTop - window.innerHeight / 2
    document.documentElement.scrollTo({ top: scrollTop, behavior: 'smooth' })
  }

  renderCursorElement (showCursorStyle) {
    if (!this._cursorCurrent) return
    const { el, data } = this._cursorCurrent
    showCursorStyle = showCursorStyle != null ? showCursorStyle : el.style.outline !== this.globalSettings.cursorBlockBorderStyle
    if (showCursorStyle) {
      el.style.outline = this.globalSettings.cursorBlockBorderStyle
    } else {
      if (data.time != null) {
        el.style.outline = this.globalSettings.filledBlockBorderStyle
      } else {
        el.style.outline = this.globalSettings.unFilledBlockBorderStyle    
      }
    }
  }

  updateBlockElementStyle (filled) {
    const { blockEl } = this.getCursorElements()
    blockEl.style.outline = filled ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
    blockEl.style.color = filled ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor
  }

  updateRubyElementStyle (index, filled) {
    const { blockEl } = this.getCursorElements()
    const rubyEl = this.cursor.lrc.data[this.cursor.row][this.cursor.col].ruby ? blockEl.children[0].children[index] : null
    rubyEl.style.outline = filled ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
    rubyEl.style.color = filled ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor
  }

  clear () {
    this.domNode.innerHTML = ''
  }

  get (row, col) {
    return this.domNode.children[row].children[col]
  }

  setBlockElementText (row, col, text) {
    this.domNode.children[row].children[col].childNodes[0].textContent = text
  }

  deleteBlockElement (row, col) {
    const r = this.domNode.children[row]
    r.removeChild(r.children[col])
  }

  addBlockElement (row, col, text) {
    const typeofRow = typeof row
    const rowElement = typeofRow === 'number' || typeofRow === 'string' ? this.domNode.children[row] : row
    const blockElement = document.createElement('ruby')
    // blockElement.style.display = 'inline-block'
    blockElement.style.height = '56px'
    blockElement.style.boxSizing = 'border-box'
    blockElement.style.padding = '24px 8px 8px 8px'
    blockElement.style.margin = '2px'
    blockElement.style.verticalAlign = 'bottom'
    blockElement.textContent = text || ''
    blockElement.style.outline = this.globalSettings.unFilledBlockBorderStyle
    blockElement.style.color = this.globalSettings.unFilledBlockTextColor
    rowElement.insertBefore(blockElement, col != null ? (rowElement.children[col + 1] || null) : null)
    return blockElement
  }

  setRubyElementText (row, col, rubyIndex, text) {
    const rt = this.domNode.children[row].children[col].children[0]
    rt.children[rubyIndex].textContent = text
  }

  deleteRubyElement (row, col, rubyIndex) {
    const rt = this.domNode.children[row].children[col].children[0]
    rt.removeChild(rt.children[rubyIndex])
    if (rt.children.length === 0) {
      this.domNode.children[row].children[col].removeChild(rt)
    }
  }

  addRubyElement (row, col, rubyIndex, text) {
    const typeofRow = typeof row
    const typeofCol = typeof col
    const colElement = typeofCol === 'number' || typeofCol === 'string'
      ? (typeofRow === 'number' || typeofRow === 'string' ? this.domNode.children[row] : row).children[col]
      : col

    let rt
    if (colElement.children.length === 0) {
      rt = document.createElement('rt')
      colElement.appendChild(rt)
    } else {
      rt = colElement.children[0]
    }
    const rubyCharElement = document.createElement('span')
    rubyCharElement.style.height = '20px'
    rubyCharElement.style.verticalAlign = 'bottom'
    rubyCharElement.style.display = 'inline-block'
    rubyCharElement.style.outline = this.globalSettings.unFilledBlockBorderStyle
    rubyCharElement.style.color = this.globalSettings.unFilledBlockTextColor
    rubyCharElement.style.boxSizing = 'border-box'
    rubyCharElement.style.padding = '1px'
    rubyCharElement.style.margin = '0 1px'
    rubyCharElement.style.position = 'relative'
    rubyCharElement.style.bottom = '2px'
    rubyCharElement.textContent = text || ''
    rt.insertBefore(rubyCharElement, rubyIndex != null ? (rt.children[rubyIndex + 1] || null) : null)
    return rubyCharElement
  }

  setLrc (lrc) {
    this.cursor.lrc = lrc
  }

  resetCursor () {
    this.cursor.reset()
  }

  rerender () {
    this.clear()
    this.cursor.lrc.data.forEach((line, row) => {
      const p = document.createElement('p')
      p.style.margin = '20px 0'
      p.style.fontSize = '24px'
      line.forEach((block, col) => {
        const blockElement = this.addBlockElement(p, col, block.word)

        blockElement.style.outline = block.time != null ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
        blockElement.style.color = block.time != null ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor

        if (block.ruby) {
          for (let i = 0; i < block.ruby.length; i++) {
            const rubyCharElement = this.addRubyElement(null, blockElement, i, block.ruby[i].word)
            rubyCharElement.style.outline = block.ruby[i].time != null ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
            rubyCharElement.style.color = block.ruby[i].time != null ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor
          }
        }
      })
      this.domNode.appendChild(p)
    })
  }

  recordTime (currentTime) {
    if (this.cursor.enableRuby) {
      const { block, ruby, blockEl, rubyEl, firstRuby } = this.getCursorElements()

      if (firstRuby || !ruby || !rubyEl) {
        blockEl.style.color = this.globalSettings.filledBlockTextColor
        blockEl.style.outline = this.globalSettings.filledBlockBorderStyle
        block.time = currentTime
      }
      if (rubyEl) {
        rubyEl.style.color = this.globalSettings.filledBlockTextColor
        rubyEl.style.outline = this.globalSettings.filledBlockBorderStyle
        ruby.time = currentTime - block.time
      }
    } else {
      const { block, blockEl } = this.getCursorElements()
      blockEl.style.color = this.globalSettings.filledBlockTextColor
      blockEl.style.outline = this.globalSettings.filledBlockBorderStyle
      block.time = currentTime
    }

    this.cursor.right()
  }

  clearCursorStyle () {
    this.renderCursorElement(false)
  }

  restartCursorTimer () {
    this.clearCursorStyle()
    clearTimeout(this._cursorTimer)
    const { block, blockEl, ruby, rubyEl } = this.getCursorElements()
    this._cursorCurrent = {
      el: this.cursor.enableRuby ? (rubyEl || blockEl) : blockEl,
      data: this.cursor.enableRuby ? (ruby || block) : block
    }
    this._cursorCallback()
  }

  getCursorElements () {
    const { block, ruby } = this.cursor.getBlocks()
    const blockEl = this.get(this.cursor.row, this.cursor.col)
    const rubyEl = this.cursor.lrc.data[this.cursor.row][this.cursor.col].ruby ? blockEl.children[0].children[this.cursor.rubyIndex] : null
    return {
      block,
      blockEl,
      ruby,
      rubyEl,
      firstRuby: Boolean(ruby && rubyEl && (this.cursor.rubyIndex === 0))
    }
  }
  
  getCursorElement () {
    const { blockEl, rubyEl } = this.getCursorElements()
    return this.cursor.enableRuby ? (rubyEl || blockEl) : blockEl
  }
}
