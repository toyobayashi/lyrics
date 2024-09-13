const timeToString = time => `${`0${Math.floor(time / 60)}`.slice(-2)}:${`0${Math.floor(time % 60)}`.slice(-2)}:${`0${Math.floor((time % 1) * 100)}`.slice(-2)}`

const stringToTime = string => {
  const [min, sec, ms] = string.split(':').map(Number)
  if (sec.includes('.')) {
    const [sec, ms] = sec.split('.').map(Number)
    return min * 60 + sec + (ms || 0) / 100
  }
  return min * 60 + sec + (ms || 0) / 100
}

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

    return lrc
  }

  /**
   * @param {string} line
   * @returns {string | Array<{ word: string; time?: number> }> | { word: string; time?: number }}
   */
  static parseText (line) {
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
      add('')
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
              rubyObject.ruby = Lyrics.parseText(ruby)
            }
            if (start) {
              const obj = Lyrics.parseText(start)
              if (obj.time) {
                rubyObject.start = obj.time
              }
            }
            if (end) {
              const obj = Lyrics.parseText(end)
              if (obj.time) {
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

    this.lines[index] = Lyrics.parseText(line)
  }
}
