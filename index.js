import { Lyrics } from './lyrics.js'
import { Cursor } from './cursor.js'

const unFilledBlockTextColor = 'black'
const filledBlockTextColor = 'red'
const unFilledBlockBorderStyle = '1px dashed gray'
const filledBlockBorderStyle = '1px solid red'
const cursorBlockBorderStyle = '2px solid blue'

const lrcInput = document.getElementById('lrc')
const soundInput = document.getElementById('sound')
const soundVideo = document.getElementById('soundVideo')
/** @type {HTMLSelectElement} */
const encoding = document.getElementById('encoding')
/** @type {HTMLInputElement} */
const enableRubyInput = document.getElementById('enableRuby')
const lrcArea = document.getElementById('lrcArea')

let enableRuby = Boolean(enableRubyInput.checked)
enableRubyInput.addEventListener('change', (e) => {
  const value = e.target.checked
  if (cursor) {
    clearCursorStyle()
    enableRuby = value
    cursor.rubyIndex = 0
    cursor._enableRuby = value
    restartCursorTimer()
  } else {
    enableRuby = value
  }
})

let lrc = null
let lrcData = []
let cursor = null
let cursorTimer = 0
let cursorBorder = false

const positionMap = new WeakMap()

const clearCursorStyle = () => {
  const el = getCursorElement()
  const block = cursor.getBlock()
  el.style.outline = block.time != null
    ? filledBlockBorderStyle
    : unFilledBlockBorderStyle
  el.style.color = block.time != null
    ? filledBlockTextColor
    : unFilledBlockTextColor
}

const restartCursorTimer = () => {
  cursorBorder = false
  clearTimeout(cursorTimer)
  cursorCallback()
}

lrcArea.addEventListener('click', (e) => {
  const target = e.target
  if (target.tagName === 'RUBY') {
    const pos = positionMap.get(target)
    if (cursor && pos) {
      clearCursorStyle()
      cursor.row = pos.row
      cursor.col = pos.col
      cursor.rubyIndex = 0
      restartCursorTimer()
    }
  } else if (target.tagName === 'RT') {
    const pos = positionMap.get(target.parentElement)
    if (cursor && pos) {
      clearCursorStyle()
      cursor.row = pos.row
      cursor.col = pos.col
      cursor.rubyIndex = 0
      restartCursorTimer()
    }
  } else if (target.tagName === 'SPAN') {
    const pos = positionMap.get(target)
    if (cursor && pos) {
      clearCursorStyle()
      cursor.row = pos.row
      cursor.col = pos.col
      cursor.rubyIndex = enableRuby ? pos.rubyIndex : 0
      restartCursorTimer()
    }
  }
}, true)

const getCursorElements = () => {
  const { block, ruby } = cursor.getBlocks()
  const blockEl = lrcArea.children[cursor.row].children[cursor.col]
  const rubyEl = lrc.data[cursor.row][cursor.col].ruby ? blockEl.children[0].children[cursor.rubyIndex] : null
  return {
    block,
    blockEl,
    ruby,
    rubyEl,
    firstRuby: Boolean(ruby && rubyEl && (cursor.rubyIndex === 0))
  }
}

const getCursorElement = () => {
  const { blockEl, rubyEl } = getCursorElements()
  return enableRuby ? (rubyEl || blockEl) : blockEl
}

const cursorCallback = () => {
  if (lrcData.length === 0) return
  cursorBorder = !cursorBorder
  getCursorElement().style.outline = cursorBorder
    ? cursorBlockBorderStyle
    : cursor.getBlock().time != null
      ? filledBlockBorderStyle
      : unFilledBlockBorderStyle
  cursorTimer = setTimeout(cursorCallback, 500)
}

soundInput.addEventListener('change', (e) => {
  if (soundVideo.src) {
    URL.revokeObjectURL(soundVideo.src)
  }
  const sound = e.target.files[0]
  soundVideo.src = URL.createObjectURL(sound)
})

lrcInput.addEventListener('change', (e) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const lrcText = new TextDecoder(encoding.value).decode(new Uint8Array(e.target.result))
    lrc = Lyrics.parse(lrcText)
    console.log(lrc)
    cursor = new Cursor(lrc, enableRuby)

    lrcData = lrc.data
    lrcArea.innerHTML = ''
    lrcData.forEach((line, row) => {
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

        positionMap.set(blockElement, { row: row, col: col })
        p.appendChild(blockElement)

        blockElement.style.outline = block.time != null ? filledBlockBorderStyle : unFilledBlockBorderStyle
        blockElement.style.color = block.time != null ? filledBlockTextColor : unFilledBlockTextColor

        if (block.ruby) {
          const rubyElement = document.createElement('rt')
          for (let i = 0; i < block.ruby.length; i++) {
            const rubyCharElement = document.createElement('span')
            rubyCharElement.style.display = 'inline-block'
            rubyCharElement.style.outline = unFilledBlockBorderStyle
            rubyCharElement.style.outline = block.ruby[i].time != null ? filledBlockBorderStyle : unFilledBlockBorderStyle
            rubyCharElement.style.color = block.ruby[i].time != null ? filledBlockTextColor : unFilledBlockTextColor
            rubyCharElement.style.boxSizing = 'border-box'
            rubyCharElement.style.padding = '1px'
            rubyCharElement.style.margin = '0 1px'
            rubyCharElement.style.position = 'relative'
            rubyCharElement.style.bottom = '2px'
            rubyCharElement.textContent = block.ruby[i].word
            positionMap.set(rubyCharElement, { row: row, col: col, rubyIndex: i })
            rubyElement.appendChild(rubyCharElement)
          }
          blockElement.appendChild(rubyElement)
        }
      })
      lrcArea.appendChild(p)
    })

    clearTimeout(cursorTimer)
    cursorCallback()
  }
  reader.readAsArrayBuffer(e.target.files[0])
})

const isVideoPlaying = video => Boolean(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2);

document.addEventListener('keydown', (e) => {
  console.log(e.key)
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    clearCursorStyle()
    cursor.right()
    restartCursorTimer()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    // if (!isVideoPlaying(soundVideo) || lrcData.length === 0) return
    clearCursorStyle()
    if (cursor.left()) {
      // el.style.color = ''
      // el.style.outline = unFilledBlockBorderStyle
      // soundVideo.currentTime = lrcData[cursor.row][cursor.col].time - 1
      // delete lrcData[cursor.row][cursor.col].time
    }
    restartCursorTimer()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    clearCursorStyle()
    cursor.down()
    restartCursorTimer()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    clearCursorStyle()
    cursor.up()
    restartCursorTimer()
  } else if (e.key === ' ') {
    e.preventDefault()
    if (!isVideoPlaying(soundVideo) || lrcData.length === 0) return

    if (enableRuby) {
      const { block, ruby, blockEl, rubyEl, firstRuby } = getCursorElements()

      const currentTime = soundVideo.currentTime
      if (firstRuby || !ruby || !rubyEl) {
        blockEl.style.color = filledBlockTextColor
        blockEl.style.outline = filledBlockBorderStyle
        block.time = currentTime
      }
      if (rubyEl) {
        rubyEl.style.color = filledBlockTextColor
        rubyEl.style.outline = filledBlockBorderStyle
        ruby.time = currentTime - block.time
      }
    } else {
      const { block, blockEl } = getCursorElements()
      const currentTime = soundVideo.currentTime
      blockEl.style.color = filledBlockTextColor
      blockEl.style.outline = filledBlockBorderStyle
      block.time = currentTime
    }

    cursor.right()
    restartCursorTimer()
  } else if (e.key === 'Enter') {
    console.log(lrc.toString())
  }
})
