import { Lyrics } from './lyrics.js'
import { Cursor } from './cursor.js'
import { Component, Emitter } from './util.js'

import { SideBar } from './components/SideBar.js'
import { LrcArea } from './components/LrcArea.js'

import { decode, encode } from 'iconv-lite'

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
    this._register(this.sideBar.blockForm.onDidInput(this.onDidFormInput, this))
    this._register(this.sideBar.blockForm.onDidAddRubyClick(this.onDidAddRubyClick, this))
    this._register(this.sideBar.blockForm.onDidAddClick(this.onDidAddClick, this))
    this._register(this.sideBar.blockForm.onDidDeleteRubyClick(this.onDidDeleteRubyClick, this))
    this._register(this.sideBar.blockForm.onDidDeleteClick(this.onDidDeleteClick, this))
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
   * @param {Event} e 
   */
  onDidFormInput (e) {
    if (e.target instanceof HTMLInputElement) {
      const isInRubyList = e.target.parentElement.parentElement instanceof HTMLLIElement
      const key = e.target.previousSibling.textContent
      const value = key === 'time' ? e.target.value === '' ? null : Number(e.target.value) : e.target.value
      if (isInRubyList) {
        const index = Array.prototype.indexOf.call(e.target.parentElement.parentElement.parentElement.children, e.target.parentElement.parentElement)
        this.lrcData[this.cursor.row][this.cursor.col].ruby[index][key] = value
        if (key === 'word') {
          this.lrcArea.setRubyElementText(this.cursor.row, this.cursor.col, index, value)
        } else if (key === 'time') {
          this.lrcArea.updateRubyElementStyle(index, value != null)
        }
      } else {
        this.lrcData[this.cursor.row][this.cursor.col][key] = value
        if (key === 'word') {
          this.lrcArea.setBlockElementText(this.cursor.row, this.cursor.col, value)
        } else if (key === 'time') {
          this.lrcArea.updateBlockElementStyle(value != null)
        }
      }
    }
  }

  onDidAddRubyClick (index) {
    const block = this.lrcData[this.cursor.row][this.cursor.col]
    if (!block.ruby) block.ruby = []
    if (index != null) {
      block.ruby.splice(index + 1, 0, { word: '', time: null })
      this.lrcArea.addRubyElement(this.cursor.row, this.cursor.col, index)
    } else {
      block.ruby.push({ word: '', time: null })
      this.lrcArea.addRubyElement(this.cursor.row, this.cursor.col, block.ruby.length - 1)
    }
  }

  onDidAddClick () {
    this.lrcData[this.cursor.row].splice(this.cursor.col + 1, 0, { word: '', time: null })
    this.lrcArea.addBlockElement(this.cursor.row, this.cursor.col)
    this.cursor.right()
  }

  onDidDeleteRubyClick (index) {
    this.lrcData[this.cursor.row][this.cursor.col].ruby.splice(index, 1)
    this.lrcArea.deleteRubyElement(this.cursor.row, this.cursor.col, index)
  }

  onDidDeleteClick () {
    this.lrcData[this.cursor.row].splice(this.cursor.col, 1)
    this.lrcArea.deleteBlockElement(this.cursor.row, this.cursor.col)
    this.lrcArea.restartCursorTimer()
  }

  /**
   * @param {boolean} value
   */
  onDidEnableRubyChange (value) {
    this.sideBar.enableRubyInput.checked = value
    this.lrcArea.restartCursorTimer()
  }

  /**
   * @param {Event} e 
   */
  onDidLrcInputChange (e) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const lrcText = decode(new Uint8Array(e.target.result), this.sideBar.encoding)
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
    if (!this.lrc) return
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
    } else if (e.key === 's' && (navigator.userAgent.includes('Mac') ? e.metaKey : e.ctrlKey)) {
      e.preventDefault()
      console.log('save')
      this.saveLrcFile()
    }
  }

  saveLrcFile () {
    const buffer = encode(this.lrc.toString(), this.sideBar.encoding)
    
    if (window.showOpenFilePicker) {
      window.showSaveFilePicker({
        startIn: 'documents',
        suggestedName: this.sideBar.lrcInput.files[0].name,
        types: [
          {
            description: 'Lyrics',
            accept: {
              'text/plain': ['.lrc', '.txt']
            }
          }
        ]
      }).then((file) => {
        file.createWritable().then((stream) => {
          stream.write(buffer)
          stream.close()
        })
      })
      return
    }
    
    const blob = new Blob([buffer])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = this.sideBar.lrcInput.files[0].name
    a.click()
    a.remove()
  }
}
