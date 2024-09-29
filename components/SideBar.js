import { Component, Emitter } from '../util.js'

/**
 * @extends {Component<HTMLDivElement>}
 */
export class SideBar extends Component {
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
