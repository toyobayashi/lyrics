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

  get enableRuby () {
    return this.enableRubyInput.checked
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
  constructor (container) {
    super(document.createElement('div'))
    this.domNode.classList.add('lrc-area')
    container.appendChild(this.domNode)
  }

  clear () {
    this.domNode.innerHTML = ''
  }

  get (row, col) {
    return this.domNode.children[row].children[col]
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
      cursorBlockBorderStyle: '2px solid blue'
    }

    this.positionMap = new WeakMap()
    this.lrc = null
    this.cursor = null
    this.cursorTimer = 0
    this.cursorBorder = false

    this.sideBar = this._register(new SideBar(this.domNode))
    this.lrcArea = this._register(new LrcArea(this.domNode))
    container.appendChild(this.domNode)

    this._register(this.sideBar.onDidLrcInputChange(this.onDidLrcInputChange, this))
    this._register(this.sideBar.onDidEnableRubyChange(this.onDidEnableRubyChange, this))
    this._addEventListener(this.lrcArea.domNode, 'click', this.onDidLrcAreaClick.bind(this), false)
    this._addEventListener(document, 'keydown', this.onDidKeydown.bind(this), false)
  }

  get lrcData () {
    return this.lrc ? this.lrc.data : []
  }

  get enableRuby () {
    return this.sideBar.enableRuby
  }

  /**
   * @param {Event} e 
   */
  onDidLrcAreaClick (e) {
    const target = e.target
    if (target.tagName === 'RUBY') {
      const pos = this.positionMap.get(target)
      if (this.cursor && pos) {
        this.clearCursorStyle()
        this.cursor.row = pos.row
        this.cursor.col = pos.col
        this.cursor.rubyIndex = 0
        this.restartCursorTimer()
      }
    } else if (target.tagName === 'RT') {
      const pos = this.positionMap.get(target.parentElement)
      if (this.cursor && pos) {
        this.clearCursorStyle()
        this.cursor.row = pos.row
        this.cursor.col = pos.col
        this.cursor.rubyIndex = 0
        this.restartCursorTimer()
      }
    } else if (target.tagName === 'SPAN') {
      const pos = this.positionMap.get(target)
      if (this.cursor && pos) {
        this.clearCursorStyle()
        this.cursor.row = pos.row
        this.cursor.col = pos.col
        this.cursor.rubyIndex = this.enableRuby ? pos.rubyIndex : 0
        this.restartCursorTimer()
      }
    }
  }

  /**
   * @param {boolean} value
   */
  onDidEnableRubyChange (value) {
    if (this.cursor) {
      const { block, blockEl, ruby, rubyEl } = this.getCursorElements()
      if (value) {
        blockEl.style.outline = block.time != null ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
        blockEl.style.color = block.time != null ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor
      } else {
        if (rubyEl && ruby) {
          rubyEl.style.outline = ruby.time != null ? this.globalSettings.filledBlockBorderStyle : this.globalSettings.unFilledBlockBorderStyle
          rubyEl.style.color = ruby.time != null ? this.globalSettings.filledBlockTextColor : this.globalSettings.unFilledBlockTextColor
        }
      }
      clearTimeout(this.cursorTimer)
      this.cursor.rubyIndex = 0
      this.cursor.setEnableRuby(value)
      this.restartCursorTimer()
    }
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
      this.cursor = new Cursor(this.lrc, this.enableRuby)

      this.lrcArea.clear()
      this.lrcData.forEach((line, row) => {
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

          this.positionMap.set(blockElement, { row: row, col: col })
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
              this.positionMap.set(rubyCharElement, { row: row, col: col, rubyIndex: i })
              rubyElement.appendChild(rubyCharElement)
            }
            blockElement.appendChild(rubyElement)
          }
        })
        this.lrcArea.domNode.appendChild(p)
      })

      clearTimeout(this.cursorTimer)
      this.cursorCallback()
    }
    reader.readAsArrayBuffer(e.target.files[0])
  }

  clearCursorStyle () {
    const el = this.getCursorElement()
    const block = this.cursor.getBlock()
    el.style.outline = block.time != null
      ? this.globalSettings.filledBlockBorderStyle
      : this.globalSettings.unFilledBlockBorderStyle
    el.style.color = block.time != null
      ? this.globalSettings.filledBlockTextColor
      : this.globalSettings.unFilledBlockTextColor
  }
  
  restartCursorTimer () {
    this.cursorBorder = false
    clearTimeout(this.cursorTimer)
    this.cursorCallback()
  }

  getCursorElements () {
    const { block, ruby } = this.cursor.getBlocks()
    const blockEl = this.lrcArea.get(this.cursor.row, this.cursor.col)
    const rubyEl = this.lrc.data[this.cursor.row][this.cursor.col].ruby ? blockEl.children[0].children[this.cursor.rubyIndex] : null
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
    return this.enableRuby ? (rubyEl || blockEl) : blockEl
  }
  
  cursorCallback () {
    if (this.lrcData.length === 0) return
    this.cursorBorder = !this.cursorBorder
    this.getCursorElement().style.outline = this.cursorBorder
      ? this.globalSettings.cursorBlockBorderStyle
      : this.cursor.getBlock().time != null
        ? this.globalSettings.filledBlockBorderStyle
        : this.globalSettings.unFilledBlockBorderStyle
    this.cursorTimer = setTimeout(this.cursorCallback.bind(this), 500)
  }

  /**
   * @param {KeyboardEvent} e
   */
  onDidKeydown (e) {
    console.log(e.key)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      this.clearCursorStyle()
      this.cursor.right()
      this.restartCursorTimer()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      // if (!this.sideBar.isPlaying() || lrcData.length === 0) return
      this.clearCursorStyle()
      if (this.cursor.left()) {
        // el.style.color = ''
        // el.style.outline = unFilledBlockBorderStyle
        // soundVideo.currentTime = lrcData[cursor.row][cursor.col].time - 1
        // delete lrcData[cursor.row][cursor.col].time
      }
      this.restartCursorTimer()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.clearCursorStyle()
      this.cursor.down()
      this.restartCursorTimer()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.clearCursorStyle()
      this.cursor.up()
      this.restartCursorTimer()
    } else if (e.key === ' ') {
      e.preventDefault()
      if (!this.sideBar.isPlaying() || this.lrcData.length === 0) return

      if (this.enableRuby) {
        const { block, ruby, blockEl, rubyEl, firstRuby } = this.getCursorElements()

        const currentTime = this.sideBar.soundVideo.currentTime
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
        const currentTime = this.sideBar.soundVideo.currentTime
        blockEl.style.color = this.globalSettings.filledBlockTextColor
        blockEl.style.outline = this.globalSettings.filledBlockBorderStyle
        block.time = currentTime
      }

      this.cursor.right()
      this.restartCursorTimer()
    } else if (e.key === 'Enter') {
      console.log(this.lrc.toString())
    }
  }
}

new App(document.body)
