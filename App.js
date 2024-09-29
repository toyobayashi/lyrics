import { Lyrics } from './lyrics.js'
import { Cursor } from './cursor.js'
import { Component } from './util.js'

import { SideBar } from './components/SideBar.js'
import { LrcArea } from './components/LrcArea.js'

/**
 * @extends {Component<HTMLDivElement>}
 */
export class App extends Component {
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
    this.sideBar.blockForm.setCursor(this.cursor)
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
      this.lrcArea.restartCursorTimer()
      this.sideBar.blockForm.onCursorChange()
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
      this.cursor.right()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      // if (!this.sideBar.isPlaying() || lrcData.length === 0) return
      if (this.cursor.left()) {
        // el.style.color = ''
        // el.style.outline = unFilledBlockBorderStyle
        // soundVideo.currentTime = lrcData[cursor.row][cursor.col].time - 1
        // delete lrcData[cursor.row][cursor.col].time
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.cursor.down()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.cursor.up()
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
