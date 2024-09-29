import { Lyrics } from './lyrics.js'
import { Cursor } from './cursor.js'
import { Component, Emitter } from './util.js'

/**
 * @extends {Component<HTMLDivElement>}
 */
class SideBar extends Component {
  constructor (container) {
    super(document.createElement('div'))

    /** @type {Emitter<boolean>} */
    this._onDidEnableRubyChange = new Emitter()
    this.onDidEnableRubyChange = this._onDidEnableRubyChange.event
    /** @type {Emitter<Event>} */
    this._onDidLrcInputChange = new Emitter()
    this.onDidLrcInputChange = this._onDidLrcInputChange.event
    /** @type {Emitter<Event>} */
    this._onDidSoundInputChange = new Emitter()
    this.onDidSoundInputChange = this._onDidSoundInputChange.event

    const domNode = this.domNode
    domNode.classList.add('side')

    let div = document.createElement('div')
    let span = document.createElement('span')
    span.textContent = 'encoding: '
    this.encodingSelect = document.createElement('select')
    ;['shift-jis', 'utf-8'].forEach((enc) => {
      const option = document.createElement('option')
      option.value = enc
      option.textContent = enc
      this.encodingSelect.appendChild(option)
    })
    div.appendChild(span)
    div.appendChild(this.encodingSelect)

    span = document.createElement('span')
    span.textContent = 'ruby: '
    this.enableRubyInput = document.createElement('input')
    this.enableRubyInput.type = 'checkbox'
    div.appendChild(span)
    div.appendChild(this.enableRubyInput)
    this._addEventListener(this.enableRubyInput, 'change', (e) => {
      this._onDidEnableRubyChange.fire(e.target.checked)
    }, false)

    domNode.appendChild(div)

    div = document.createElement('div')
    div.classList.add('mt-4')
    span = document.createElement('span')
    span.textContent = 'lrc: '
    this.lrcInput = document.createElement('input')
    this.lrcInput.type = 'file'
    div.appendChild(span)
    div.appendChild(this.lrcInput)
    domNode.appendChild(div)
    this._addEventListener(this.lrcInput, 'change', (e) => {
      this._onDidLrcInputChange.fire(e)
    }, false)

    div = document.createElement('div')
    div.classList.add('mt-4')
    span = document.createElement('span')
    span.textContent = 'sound: '
    this.soundInput = document.createElement('input')
    this.soundInput.type = 'file'
    div.appendChild(span)
    div.appendChild(this.soundInput)
    domNode.appendChild(div)
    this._addEventListener(this.soundInput, 'change', (e) => {
      if (this.soundVideo.src) {
        URL.revokeObjectURL(this.soundVideo.src)
      }
      const sound = e.target.files[0]
      this.soundVideo.src = URL.createObjectURL(sound)

      this._onDidSoundInputChange.fire(e)
    }, false)

    div = document.createElement('div')
    div.classList.add('mt-4')
    this.soundVideo = document.createElement('video')
    this.soundVideo.setAttribute('controls', '')
    this.soundVideo.setAttribute('width', '400')
    div.appendChild(this.soundVideo)
    domNode.appendChild(div)

    container.appendChild(domNode)
  }

  get encoding () {
    return this.encodingSelect.value
  }

  isPlaying () {
    return Boolean(this.soundVideo.currentTime > 0 && !this.soundVideo.paused && !this.soundVideo.ended && this.soundVideo.readyState > 2)
  }
}

/**
 * @extends {Component<HTMLDivElement>}
 */
class LrcArea extends Component {
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
        }
      } else if (target.tagName === 'RT') {
        const rubyElement = target.parentElement
        if (this.cursor) {
          this.cursor.set(
            Array.prototype.indexOf.call(rubyElement.parentElement.parentElement.children, rubyElement.parentElement),
            Array.prototype.indexOf.call(rubyElement.parentElement.children, rubyElement),
            0
          )
        }
      } else if (target.tagName === 'SPAN') {
        const rubyElement = target.parentElement.parentElement
        if (this.cursor) {
          this.cursor.set(
            Array.prototype.indexOf.call(rubyElement.parentElement.parentElement.children, rubyElement.parentElement),
            Array.prototype.indexOf.call(rubyElement.parentElement.children, rubyElement),
            Array.prototype.indexOf.call(target.parentElement.children, target)
          )
        }
      } else {
        this.clearCursorStyle()
        this._cursorCurrent = null
      }
    })

    this.globalSettings = globalSettings
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

  clear () {
    this.domNode.innerHTML = ''
  }

  get (row, col) {
    return this.domNode.children[row].children[col]
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
        const blockElement = document.createElement('ruby')
        // blockElement.style.display = 'inline-block'
        // blockElement.style.height = '40px'
        blockElement.style.boxSizing = 'border-box'
        blockElement.style.padding = '24px 8px 8px 8px'
        blockElement.style.margin = '2px'
        blockElement.style.verticalAlign = 'bottom'
        blockElement.textContent = block.word

        p.appendChild(blockElement)

        blockElement.style.outline = block.time != null ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
        blockElement.style.color = block.time != null ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor

        if (block.ruby) {
          const rubyElement = document.createElement('rt')
          for (let i = 0; i < block.ruby.length; i++) {
            const rubyCharElement = document.createElement('span')
            rubyCharElement.style.display = 'inline-block'
            rubyCharElement.style.outline = this.globalSettings.unFilledBlockBorderStyle
            rubyCharElement.style.outline = block.ruby[i].time != null ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
            rubyCharElement.style.color = block.ruby[i].time != null ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor
            rubyCharElement.style.boxSizing = 'border-box'
            rubyCharElement.style.padding = '1px'
            rubyCharElement.style.margin = '0 1px'
            rubyCharElement.style.position = 'relative'
            rubyCharElement.style.bottom = '2px'
            rubyCharElement.textContent = block.ruby[i].word
            rubyElement.appendChild(rubyCharElement)
          }
          blockElement.appendChild(rubyElement)
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

  up () {
    const ret = this.cursor.up()
    return ret
  }

  down () {
    const ret = this.cursor.down()
    return ret
  }

  left () {
    const ret = this.cursor.left()
    return ret
  }

  right () {
    const ret = this.cursor.right()
    return ret
  }
}

/**
 * @extends {Component<HTMLDivElement>}
 */
class App extends Component {
  constructor (container) {
    super(document.createElement('div'))
    this.globalSettings = {
      unFilledBlockTextColor: 'black',
      filledBlockTextColor: 'red',
      unFilledBlockBorderStyle: '1px dashed gray',
      filledBlockBorderStyle: '1px solid red',
      cursorBlockBorderStyle: 'blue solid 2px'
    }

    this.lrc = null
    
    this.sideBar = this._register(new SideBar(this.domNode))
    this.cursor = new Cursor(null, this.sideBar.enableRubyInput.checked)
    this._register(this.sideBar.onDidEnableRubyChange((value) => {
      this.cursor.enableRuby = value
    }))
    this.lrcArea = this._register(new LrcArea(this.domNode, this.globalSettings, this.cursor))
    container.appendChild(this.domNode)

    this._register(this.sideBar.onDidLrcInputChange(this.onDidLrcInputChange, this))
    this._register(this.cursor.onDidEnableRubyChange(this.onDidEnableRubyChange, this))
    this._addEventListener(document, 'keydown', this.onDidKeydown.bind(this), false)
  }

  dispose () {
    super.dispose()
    this.lrcArea = null
    this.sideBar = null
    this.cursor = null
  }

  get lrcData () {
    return this.lrc ? this.lrc.data : []
  }

  /**
   * @param {boolean} value
   */
  onDidEnableRubyChange (value) {
    this.sideBar.enableRubyInput.checked = value
    this.lrcArea.onDidCursorChange()
  }

  /**
   * @param {Event} e 
   */
  onDidLrcInputChange (e) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const lrcText = new TextDecoder(this.sideBar.encoding).decode(new Uint8Array(e.target.result))
      this.lrc = Lyrics.parse(lrcText)
      console.log(this.lrc)
      this.cursor.lrc = this.lrc
      this.lrcArea.rerender()
      this.cursor.reset()
    }
    reader.readAsArrayBuffer(e.target.files[0])
  }

  /**
   * @param {KeyboardEvent} e
   */
  onDidKeydown (e) {
    console.log(e.key)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      this.lrcArea.right()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      // if (!this.sideBar.isPlaying() || lrcData.length === 0) return
      if (this.lrcArea.left()) {
        // el.style.color = ''
        // el.style.outline = unFilledBlockBorderStyle
        // soundVideo.currentTime = lrcData[cursor.row][cursor.col].time - 1
        // delete lrcData[cursor.row][cursor.col].time
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.lrcArea.down()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.lrcArea.up()
    } else if (e.key === ' ') {
      e.preventDefault()
      if (!this.sideBar.isPlaying() || this.lrcData.length === 0) return
      const currentTime = this.sideBar.soundVideo.currentTime
      this.lrcArea.recordTime(currentTime)
    } else if (e.key === 'Enter') {
      console.log(this.lrc.toString())
    }
  }
}

new App(document.body)
