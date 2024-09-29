import { Component } from '../util.js'

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
        const rubyList = this.rubyList = document.createElement('ul')
        // rubyList.style.listStyle = 'none'
        rubyList.style.flex = '1'
        rubyList.style.padding = '0'
        rubyList.style.margin = '0'
        div.appendChild(rubyList)
      } else {
        const input = this[`${name}Input`] = document.createElement('input')
        input.name = name
        input.id = name
        if (name === 'time') {
          input.type = 'number'
          input.setAttribute('disabled', 'disabled')
        } else {
          input.type = 'text'
        }
        div.appendChild(input)
      }

      domNode.appendChild(div)
    })

    const editButton = document.createElement('button')
    editButton.type = 'submit'
    editButton.textContent = 'Edit'
    domNode.appendChild(editButton)

    this._addEventListener(domNode, 'submit', (e) => {
      e.preventDefault()
      // TODO
      // Array.prototype.forEach.call(e.target.elements, (el) => {
      //   console.log(el.value, el)
      // })
    })

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
    console.log(111)
    this.rubyList.innerHTML = ''
    const { block } = this.cursor.getBlocks()
    this.wordInput.value = (block && block.word != null) ? block.word : ''
    this.timeInput.value = (block && block.time != null) ? block.time : ''
    if (block && block.ruby) {
      block.ruby.forEach((ruby, i) => {
        const li = document.createElement('li')
        li.style.margin = '8px 0'
        li.style.padding = '0 8px'
        li.style.border = '#ccc solid 1px'
        
        const name = `ruby[${i}]`
        const div = document.createElement('div')
        div.style.margin = '8px 0'
        const label = document.createElement('label')
        label.style.display = 'inline-block'
        label.style.width = '120px'
        // label.setAttribute('for', name)
        label.textContent = `${name}.word`
        div.appendChild(label)

        const input = document.createElement('input')
        input.type = 'text'
        input.name = `${name}.word`
        input.id = `${name}.word`
        input.value = ruby.word != null ? ruby.word : ''
        div.appendChild(input)

        const div2 = document.createElement('div')
        div2.style.margin = '8px 0'
        const label2 = document.createElement('label')
        label2.style.display = 'inline-block'
        label2.style.width = '120px'
        // label2.setAttribute('for', name)
        label2.textContent = `${name}.time`
        div2.appendChild(label2)

        const time = document.createElement('input')
        time.type = 'number'
        time.name = `${name}.time`
        time.id = `${name}.time`
        time.setAttribute('disabled', 'disabled')
        time.value = ruby.time != null ? ruby.time : ''
        div2.appendChild(time)

        li.appendChild(div)
        li.appendChild(div2)
        this.rubyList.appendChild(li)
      })
    }
  }

  dispose () {
    super.dispose()
    if (this._disposeCursor) {
      this._disposeCursor()
    }
  }
}
