import { Component, Emitter } from '../util.js'

/**
 * @extends {Component<HTMLFormElement>}
 */
export class BlockForm extends Component {
  constructor (container) {
    super(document.createElement('form'))
    /** @type {import('../cursor.js').Cursor} */
    this.cursor = null
    this._disposeCursor = null

    const domNode = this.domNode
    domNode.classList.add('block-form', 'mt-4')
    domNode.style.padding = '0 8px'
    domNode.style.border = '#ccc solid 1px'
    domNode.style.display = 'none'

    ;['word', 'time', 'ruby'].forEach((name) => {
      const div = document.createElement('div')
      div.style.margin = '8px 0'
      const label = document.createElement('label')
      label.style.display = 'inline-block'
      label.style.width = '60px'
      // label.setAttribute('for', name)
      label.textContent = name
      div.appendChild(label)

      if (name === 'ruby') {
        div.style.display = 'flex'
        div.style.justifyContent = 'space-between'

        const wrap = document.createElement('div')
        wrap.style.flex = '1'
        const rubyList = this.rubyList = document.createElement('ul')
        // rubyList.style.listStyle = 'none'
        rubyList.style.padding = '0'
        rubyList.style.margin = '0'
        wrap.appendChild(rubyList)

        const addButton = this.rubyListAddButton = document.createElement('button')
        addButton.type = 'button'
        addButton.textContent = 'Add Ruby'
        wrap.appendChild(addButton)
        div.appendChild(wrap)
      } else {
        const input = this[`${name}Input`] = document.createElement('input')
        input.name = name
        input.id = name
        if (name === 'time') {
          input.type = 'number'
          input.style.width = '140px'
          input.setAttribute('min', '0')
          input.setAttribute('step', '0.1')
          // input.setAttribute('disabled', 'disabled')
        } else {
          input.type = 'text'
          input.style.width = '140px'
        }
        div.appendChild(input)
      }

      domNode.appendChild(div)
    })

    // const editButton = document.createElement('button')
    // editButton.type = 'submit'
    // editButton.textContent = 'Edit'
    // domNode.appendChild(editButton)

    const buttonDiv = document.createElement('div')
    buttonDiv.style.margin = '8px 0'
    const addButton = document.createElement('button')
    addButton.type = 'button'
    addButton.textContent = 'Add'
    buttonDiv.appendChild(addButton)

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.textContent = 'Delete'
    deleteButton.style.marginLeft = '8px'
    buttonDiv.appendChild(deleteButton)
    domNode.appendChild(buttonDiv)

    // /** @type {Emitter<SubmitEvent>} */
    // this._onDidSubmit = new Emitter()
    // /** @type {Emitter<SubmitEvent>['event']} */
    // this.onDidSubmit = this._onDidSubmit.event

    /** @type {Emitter<Event>} */
    this._onDidInput = new Emitter()
    /** @type {Emitter<Event>['event']} */
    this.onDidInput = this._onDidInput.event

    /** @type {Emitter<number>} */
    this._onDidDeleteRubyClick = new Emitter()
    /** @type {Emitter<number>['event']} */
    this.onDidDeleteRubyClick = this._onDidDeleteRubyClick.event
    /** @type {Emitter<number>} */
    this._onDidAddRubyClick = new Emitter()
    /** @type {Emitter<Event>['event']} */
    this.onDidAddRubyClick = this._onDidAddRubyClick.event
    /** @type {Emitter<Event>} */
    this._onDidAddClick = new Emitter()
    /** @type {Emitter<Event>['event']} */
    this.onDidAddClick = this._onDidAddClick.event
    /** @type {Emitter<Event>} */
    this._onDidDeleteClick = new Emitter()
    /** @type {Emitter<Event>['event']} */
    this.onDidDeleteClick = this._onDidDeleteClick.event

    // this._addEventListener(domNode, 'submit', (e) => {
    //   e.preventDefault()
    //   this._onDidSubmit.fire(e)
    // })

    this._addEventListener(domNode, 'input', (e) => {
      this._onDidInput.fire(e)
    }, true)

    this._addEventListener(domNode, 'click', (e) => {
      if (e.target instanceof HTMLButtonElement) {
        if (e.target.textContent === 'Add Ruby') {
          const index = e.target.parentElement instanceof HTMLLIElement ? Array.prototype.indexOf.call(e.target.parentElement.parentElement.children, e.target.parentElement) : null
          this.addRubyItem(index)
          if (index == null) {
            this.rubyListAddButton.style.display = 'none'
          }
          this._onDidAddRubyClick.fire(index)
        } else if (e.target.textContent === 'Delete Ruby') {
          const index = Array.prototype.indexOf.call(e.target.parentElement.parentElement.children, e.target.parentElement)
          if (this.rubyList.children.length === 1) {
            this.rubyListAddButton.style.display = 'inline'
          }
          this.deleteRubyItem(index)
          this._onDidDeleteRubyClick.fire(index)
        } else if (e.target.textContent === 'Add') {
          this._onDidAddClick.fire(e)
        } else if (e.target.textContent === 'Delete') {
          this._onDidDeleteClick.fire(e)
        }
      }
    }, true)

    container.appendChild(this.domNode)
  }

  setCursor (cursor) {
    if (this._disposeCursor) {
      this._disposeCursor()
    }
    this.cursor = cursor
    if (this.cursor) {
      if (this.cursor.lrc) this.domNode.style.display = 'block'
      const disposeChange = this.cursor.onDidChange(this.onCursorChange, this)
      const disposeLrcChange = this.cursor.onDidLrcChange((lrc) => {
        if (lrc) {
          this.domNode.style.display = 'block'
        } else {
          this.domNode.style.display = 'none'
        }
      })
      this._disposeCursor = () => {
        disposeChange()
        disposeLrcChange()
      }
    } else {
      this.domNode.style.display = 'none'
    }
  }

  onCursorChange () {
    this.rubyList.innerHTML = ''
    const { block } = this.cursor.getBlocks()
    this.wordInput.value = (block && block.word != null) ? block.word : ''
    this.timeInput.value = (block && block.time != null) ? block.time : ''
    if (block && block.ruby) {
      block.ruby.forEach((ruby) => {
        this.addRubyItem(null, ruby.word, ruby.time)
      })
      this.rubyListAddButton.style.display = 'none'
    } else {
      this.rubyListAddButton.style.display = 'inline'
    }
  }

  addRubyItem (index, word, t) {
    const li = document.createElement('li')
    li.style.margin = '8px 0'
    li.style.padding = '0 8px'
    li.style.border = '#ccc solid 1px'
    li.style.position = 'relative'
    li.style.listStyle = 'none'

    const div = document.createElement('div')
    div.style.margin = '8px 0'
    const label = document.createElement('label')
    label.style.display = 'inline-block'
    label.style.width = '48px'
    // label.setAttribute('for', name)
    label.textContent = 'word'
    div.appendChild(label)

    const input = document.createElement('input')
    input.type = 'text'
    input.value = word != null ? word : ''
    input.style.width = '140px'
    div.appendChild(input)

    const div2 = document.createElement('div')
    div2.style.margin = '8px 0'
    const label2 = document.createElement('label')
    label2.style.display = 'inline-block'
    label2.style.width = '48px'
    // label2.setAttribute('for', name)
    label2.textContent = 'time'
    div2.appendChild(label2)

    const time = document.createElement('input')
    time.type = 'number'
    time.setAttribute('min', '0')
    time.setAttribute('step', '0.1')
    // time.setAttribute('disabled', 'disabled')
    time.value = t != null ? t : ''
    time.style.width = '140px'
    div2.appendChild(time)

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.textContent = 'Delete Ruby'
    deleteButton.style.position = 'absolute'
    deleteButton.style.right = '8px'
    deleteButton.style.top = '10px'
    deleteButton.style.width = '100px'

    const addButton = document.createElement('button')
    addButton.type = 'button'
    addButton.textContent = 'Add Ruby'
    addButton.style.position = 'absolute'
    addButton.style.right = '8px'
    addButton.style.bottom = '8px'
    addButton.style.width = '100px'

    li.appendChild(div)
    li.appendChild(div2)
    li.appendChild(deleteButton)
    li.appendChild(addButton)

    this.rubyList.insertBefore(li, index != null ? (this.rubyList.children[index + 1] || null) : null)
  }

  deleteRubyItem (index) {
    this.rubyList.removeChild(this.rubyList.children[index])
  }

  dispose () {
    super.dispose()
    if (this._disposeCursor) {
      this._disposeCursor()
    }
  }
}
