const timeToString = time => `${`0${Math.floor(time / 60)}`.slice(-2)}:${`0${Math.floor(time % 60)}`.slice(-2)}:${`0${Math.floor((time % 1) * 100)}`.slice(-2)}`

const stringToTime = string => {
  const [min, sec, ms] = string.split(':')
  if (sec.includes('.')) {
    const [sec, ms] = sec.split('.').map(Number)
    return Number(min) * 60 + sec + (ms || 0) / 100
  }
  return Number(min) * 60 + Number(sec) + (Number(ms) || 0) / 100
}

const clone = typeof structuredClone === 'function' ? structuredClone : (obj => JSON.parse(JSON.stringify(obj)))
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export class Lyrics {
  constructor () {
    /**
     * Title
     * @type {string=}
     */
    this.title = undefined

    /**
     * Artist
     * @type {string=}
     */
    this.artist = undefined

    /**
     * Album
     * @type {string=}
     */
    this.album = undefined

    /**
     * Bgfile
     * @type {string=}
     */
    this.bgfile = undefined

    /**
     * Bgfolder
     * @type {string=}
     */
    this.bgfolder = undefined

    /**
     * TimeRatio
     * @type {number=}
     */
    this.timeRatio = undefined

    /**
     * Offset (ms)
     * @type {number=}
     */
    this.offset = undefined

    /**
     * SilencemSec (ms)
     * @type {number=}
     */
    this.silencemSec = undefined

    /**
     * TaggingBy (ms)
     * @type {string=}
     */
    this.taggingBy = undefined

    /**
     * EditedBy (ms)
     * @type {string=}
     */
    this.editedBy = undefined

    /**
     * Silence
     * @type {number=}
     */
    this.silence = undefined

    /**
     * Flames
     * @type {number=}
     */
    this.flames = undefined

    /**
     * TotalSec
     * @type {number=}
     */
    this.totalSec = undefined

    /**
     * TimeType
     * @type {'WinAmp' | 'Normal'=}
     */
    this.timeType = undefined

    /**
     * TimeBase
     * @type {Array<string | Array<{ word: string; time?: number; ruby?: Array<{ word: string; time?: number }> }>>}
     */
    this.lines = []

    /**
     * Ruby
     * @type {Array<{ target: string; ruby?: Array<{ word: string; time?: number }>; start?: number; end?: number }>}
     */
    this.ruby = []
  }

  /**
   * @type {Array<Array<{ word: string; time?: number; ruby?: Array<{ word: string; time?: number }> }>>}
   */
  get data () {
    return this.lines.filter(line => Array.isArray(line))
  }

  /**
   * Parse lrc text
   * @param {string} lrcText
   * @returns {Lyrics}
   */
  static parse (lrcText) {
    const lrc = new Lyrics()

    const lrcLines = lrcText.split(/\r?\n/)
    lrcLines.forEach((line, index) => {
      lrc.parseLine(line, index)
    })

    const data = lrc.data
    for (let i = 0; i < data.length; ++i) {
      const line = data[i]
      for (let j = 0; j < line.length; ++j) {
        const block = line[j]
        const ruby = lrc.ruby.find(r => r.target === block.word)
        if (ruby) {
          block.ruby = clone(ruby.ruby)
        }
      }
    }

    return lrc
  }

  /**
   * @param {string} line
   * @param {boolean=} emptySuffix
   * @returns {string | Array<{ word: string; time?: number> }> | { word: string; time?: number }}
   */
  static parseText (line, emptySuffix) {
    if (line.trim() === '') {
      return line
    }

    const chars = line.split('')
    let word = ''
    let timeTag = ''
    let time = -1

    const arr = []

    const add = (w) => {
      const block = { word: w }
      if (time !== -1) {
        block.time = time
        time = -1
      }
      arr.push(block)
    }

    for (let i = 0; i < chars.length; i++) {
      const currentChar = chars[i]
      const code = currentChar.charCodeAt(0)

      if (timeTag !== '') {
        if (currentChar === ']') {
          timeTag += currentChar
          const timeString = timeTag.slice(1, -1)
          if (!timeString.includes(':')) {
            console.warn(`Invalid time tag at line ${index}, column ${i}`)
            return line
          }
          time = stringToTime(timeString)
          timeTag = ''
          continue
        }

        if (!((code >= 0x30 && code <= 0x39) || (code === 0x3a) || (code === 0x2e))) {
          console.warn(`Invalid character in time tag at line ${index}, column ${i}`)
          return line
        }

        timeTag += currentChar
        continue
      }

      if (currentChar === '[') {
        timeTag += currentChar
      } else if (currentChar === ' ') {
        if (word.trim() === '') {
          word += ' '
        } else {
          add(word)
          word = ' '
        }
      } else {
        if (word.trim() === '' && word !== '') {
          add(word)
          word = ''
        }
        if (code < 0x20 || code > 0x7e) {
          word += currentChar
          add(word)
          word = ''
        } else {
          word += currentChar
        }
      }
    }

    if (word.length > 0 && word.trim() !== '') {
      add(word)
      word = ''
    }

    if (arr.length > 0) {
      if (emptySuffix) {
        add('')
      }
      return arr
    }

    const ret = { word }
    if (time !== -1) {
      ret.time = time
    }
    return ret
  }

  /**
   * @param {string} line
   * @param {number} index
   */
  parseLine (line, index) {
    if (line.charCodeAt(0) === 0x40) {
      const [key, value] = line.split(/\s*=\s*/)
      const tagName = key.slice(1)
      switch (tagName) {
        case 'Title':
          this.title = value
          break
        case 'Artist':
          this.artist = value
          break
        case 'Album':
          this.album = value
          break
        case 'Bgfile':
          this.bgfile = value
          break
        case 'Bgfolder':
          this.bgfolder = value
          break
        case 'TimeRatio':
          this.timeRatio = parseFloat(value)
          break
        case 'Offset':
          this.offset = parseInt(value)
          break
        case 'SilencemSec':
          this.silencemSec = parseInt(value)
          break
        case 'TaggingBy':
          this.taggingBy = value
          break
        case 'EditedBy':
          this.editedBy = value
          break
        case 'Silence':
          this.silence = parseInt(value)
          break
        case 'Flames':
          this.flames = parseInt(value)
          break
        case 'TotalSec':
          this.totalSec = parseInt(value)
          break
        case 'TimeType':
          this.timeType = value
          break
        default: {
          if (tagName.startsWith('Ruby')) {
            const [_, i] = tagName.split('Ruby')
            const indexNumber = Number(i)
            if (Number.isNaN(indexNumber)) {
              console.warn(`Unknown tag: ${tagName}`)
              break
            }
            const [target, ruby, start, end] = value.split(',')
            const rubyObject = { target }
            if (ruby) {
              rubyObject.ruby = Lyrics.parseText(ruby, false)
            }
            if (start) {
              const obj = Lyrics.parseText(start, false)
              if (obj.time != null) {
                rubyObject.start = obj.time
              }
            }
            if (end) {
              const obj = Lyrics.parseText(end, false)
              if (obj.time != null) {
                rubyObject.end = obj.time
              }
            }
            this.ruby[indexNumber - 1] = rubyObject
            break
          } else {
            console.warn(`Unknown tag: ${tagName}`)
            break
          }
        }
      }
      this.lines[index] = line
      return
    }

    this.lines[index] = Lyrics.parseText(line, true)
  }

  saveRuby () {
    const data = this.data
    const rubyList = []
    for (let i = 0; i < data.length; ++i) {
      const line = data[i]
      for (let j = 0; j < line.length; ++j) {
        const block = line[j]
        if (block.ruby) {
          const found = rubyList.filter(r => r.target === block.word)
          if (found.some(r => deepEqual(r.ruby, block.ruby))) {
            continue
          } else {
            if (found.length > 0) found[found.length - 1].end = block.time
            if (found.length > 0) {
              rubyList.push({ target: block.word, ruby: clone(block.ruby), start: block.time })
            } else {
              rubyList.push({ target: block.word, ruby: clone(block.ruby) })
            }
          }
        }
      }
    }
    this.ruby = rubyList
  }

  toString () {
    const strLines = []
    const rubyLines = []
    for (let i = 0; i < this.lines.length; ++i) {
      const line = this.lines[i]
      if (Array.isArray(line)) {
        strLines[i] = line.map(block => {
          if (block.time != null) {
            return `[${timeToString(block.time)}]${block.word}`
          } else {
            return block.word
          }
        }).join('')
      } else if (typeof line === 'string') {
        if (line.startsWith('@Ruby')) {
          rubyLines.push(i)
        } else {
          strLines[i] = line
        }
      } else {
        throw new Error('Invalid line')
      }
    }
    this.saveRuby()
    this.ruby.forEach((r, n) => {
      const arr = [
        r.target,
        r.ruby ? r.ruby.map(block => {
          if (block.time != null) {
            return `[${timeToString(block.time)}]${block.word}`
          } else {
            return block.word
          }
        }).join('') : undefined,
        r.start != null ? timeToString(r.start) : undefined,
        r.end != null ? timeToString(r.end) : undefined
      ]
      let i = arr.length - 1
      for (; i >= 0; --i) {
        if (arr[i] === undefined) {
          arr.length = i
        } else {
          break
        }
      }
      const rubyValue = arr.join(',')
      const line = `@Ruby${n + 1}=${rubyValue}`
      const lineNumber = rubyLines.shift()
      if (lineNumber) {
        strLines[lineNumber] = line
      } else {
        strLines.push(line)
      }
    })
    return strLines.join('\r\n')
  }
}
