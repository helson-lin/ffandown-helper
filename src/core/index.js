/**
 * @description M3U8 to MP4 Converter
 * @author Furkan Inanc, Helson Lin
 * @version 1.0.0
 */
const ffmpeg = require('fluent-ffmpeg')
const log = require('../utils/logger')
const fetch = require('node-fetch')
/**
  * A class to convert M3U8 to MP4
  * @class
  */
class FfmpegHelper {
    PRESET
    OUTPUTFORMAT
    USER_AGENT
    THREADS
    M3U8_FILE
    VERBOSE
    PROTOCOL_TYPE
    constructor (options) {
        if (options?.THREADS) this.THREADS = options.THREADS
        if (options?.VERBOSE) log.level = options.VERBOSE ? 'verbose' : 'silent'
    }

    setUserAgent (USER_AGENT) {
        if (USER_AGENT) this.USER_AGENT = USER_AGENT
        return this
    }

    /**
      * Sets the input file
      * @param {String} filename M3U8 file path. You can use remote URL
      * @returns {Function}
      */
    async setInputFile (M3U8_FILE, USER_AGENT) {
        if (!M3U8_FILE) throw new Error('You must specify the M3U8 file address')
        this.M3U8_FILE = M3U8_FILE
        this.PROTOCOL_TYPE = await this.getProtocol(this.M3U8_FILE, USER_AGENT)
        return this
    }

    /**
    * Sets the output file
    * @param {String} filename Output file path. Has to be local :)
    * @returns {Function}
    */
    setOutputFile (OUTPUT_FILE) {
        if (!OUTPUT_FILE) throw new Error('You must specify the OUTPUT_FILE')
        this.OUTPUT_FILE = OUTPUT_FILE
        return this
    }

    /**
    * Sets the thread
    * @param {Number} number thread number
    * @returns {Function}
    */
    setThreads (number) {
        if (number) {
            this.THREADS = number
        }
        return this
    }

    /**
     * Description set video preset
     * @date 2023/11/13 - 16:03:29
     * @param {String} preset video preset
     */
    setPreset (preset) {
        if (preset) {
            this.PRESET = preset
        }
        return this
    }

    setOutputFormat (outputformat) {
        if (outputformat) {
            this.OUTPUTFORMAT = outputformat
        }
        return this
    }

    setTimeMark (time) {
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d).[0-9]{2}$/
        if (time && timePattern.test(time)) {
            this.TIMEMARK = time
        }
        return this
    }

    /**
     *  check the download url file contentType
     * @param {String} url
     * @return {Promise<m3u8|unknown>} 
     * @memberof FfmpegHelper
     */
    checkUrlContentType (url, USER_AGENT) {
        return new Promise((resolve, reject) => {
            // prefetch media need carry User-Agent
            fetch(url, 
                { headers: { 'User-Agent': USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36' },
                }).then(async (res) => {
                const headers = res.headers
                const contentType = headers['content-type'] || headers.get('content-type')
                const data = await res.text()
                if (['audio/x-mpegurl', 'application/vnd.apple.mpegURL'].includes(contentType) || data.replace(/\s+/g, '').startsWith('#EXTM3U')) {
                    resolve('m3u8')
                } else {
                    switch (contentType) {
                        case 'video/mp4':
                            resolve('mp4')
                            break
                        default:
                            resolve('unknown')
                            break
                    }
                }
            }).catch(e => resolve('unknown'))
        })
    }

    /**
      * 获取地址协议
      * @date 3/30/2023 - 11:50:14 AM
      * @param {string} url
      * @returns {("live" | "m3u8" | "mp4" | "unknown")}
      */
    async getProtocol (url, USER_AGENT) {
        switch (true) {
            case url.startsWith('rtmp://'):
            case url.startsWith('rtsp://'):
                return 'live'
            case url.indexOf('.m3u8') !== -1:
            case url.indexOf('.flv') !== -1:
                return 'm3u8'
            default:
                return await this.checkUrlContentType(url, USER_AGENT)
        }
    }

    setInputOption () {
        const USER_AGENT = this.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        const REFERER_RGX = /^(?<referer>http|https:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d+)?\/[^ "]+$/u
        const match = this.M3U8_FILE.match(REFERER_RGX)
        const [referer] = match === null ? ['unknown'] : match.slice(1)
        const options = []
        if (USER_AGENT) options.push('-user_agent', `${USER_AGENT}`)
        if (referer !== 'unknown') options.push('-referer', `${referer}`)
        options.length && this.ffmpegCmd.inputOptions(options)
    }

    setOutputOption () {
        if (this.THREADS) {
            this.ffmpegCmd.outputOptions([
                `-threads ${this.THREADS}`,
                '-max_muxing_queue_size 9999',
            ])
        }
        if (this.TIMEMARK) {
            this.ffmpegCmd.seekInput(this.TIMEMARK)
        }
        this.ffmpegCmd.outputOptions(`-preset ${this.PRESET || 'veryfast'}`)
        const liveProtocol = this.PROTOCOL_TYPE
        switch (liveProtocol) {
            default:
                this.ffmpegCmd
                .outputOptions('-c:v copy')
                .outputOptions('-c:a copy')
                .output(this.OUTPUT_FILE)
                break
        }
    }

    monitorProcess (callback) {
        const USER_AGENT = this.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'
        this.ffmpegCmd.ffprobe(['-user_agent',
        `${USER_AGENT}`], (err, data) => {
            if (err) {
                log.error(`Error: ${err.message}`)
                return
            }
            const toFixed = (val, precision = 1) => {
                const multiplier = 10 ** precision
                return Math.round(val * multiplier) / multiplier
            }
            const formatFileSize = (fileSizeKb) => {
                const fileSizeMb = fileSizeKb / 1024
                const fileSizeGb = fileSizeMb / 1024

                if (fileSizeGb >= 1) {
                    const speedGbps = fileSizeGb.toFixed(2)
                    return `${speedGbps} GB`
                } else if (fileSizeMb >= 1) {
                    const speedMbps = fileSizeMb.toFixed(2)
                    return `${speedMbps} MB`
                } else {
                    const speedKbps = fileSizeKb.toFixed(2)
                    return `${speedKbps} KB`
                }
            }
            const formatSpeed = (speedKbps) => {
                const speedMbps = speedKbps / 1000
                const speedGbps = speedMbps / 1000
                if (speedGbps >= 1) {
                    const formattedSpeed = speedGbps.toFixed(2)
                    return `${formattedSpeed} Gb/s`
                } else if (speedMbps >= 1) {
                    const formattedSpeed = speedMbps.toFixed(2)
                    return `${formattedSpeed} Mb/s`
                } else {
                    const formattedSpeed = speedKbps.toFixed(2)
                    return `${formattedSpeed} Kb/s`
                }
            }
            const timemarkToSeconds = (timemark) => {
                // 通过冒号将时间戳拆分为时、分、秒和小数秒
                const [hours, minutes, seconds, decimals] = timemark.split(':')
                
                // 将时、分、秒转换为整数
                const hoursInSeconds = parseInt(hours, 10) * 3600
                const minutesInSeconds = parseInt(minutes, 10) * 60
                const secondsInSeconds = parseInt(seconds, 10)
                
                // 将小数秒转换为浮点数
                const decimalsInSeconds = parseFloat(`0.${decimals}`)
                
                // 计算总秒数
                const totalSeconds = hoursInSeconds + minutesInSeconds + secondsInSeconds + decimalsInSeconds
                
                return totalSeconds
            }
            const { duration } = data.format
            this.ffmpegCmd
            .on('progress', (progress) => {
                // todo: fixed duration undefined situation
                let percent
                if (!progress.percent) {
                    percent = toFixed((timemarkToSeconds(progress.timemark) / duration) * 100)
                } else {
                    percent = toFixed((progress.percent * 100) / 100)
                }
                const currentMbs = formatSpeed(progress.currentKbps)
                if (callback && typeof callback === 'function') {
                    const params = {
                        percent: percent >= 100 ? 100 : percent,
                        currentMbs,
                        timemark: progress.timemark,
                        targetSize: formatFileSize(progress.targetSize),
                    }
                    callback(params)
                }
            })
            .run()
        })
    }

    /**
    * Start download mission
    */
    start (listenProcess) {
        return new Promise((resolve, reject) => {
            if (!this.M3U8_FILE || !this.OUTPUT_FILE) {
                reject(new Error('You must specify the input and the output files'))
                return
            }
            this.ffmpegCmd = ffmpeg(this.M3U8_FILE)
            this.ffmpegCmd
            .on('error', (error) => {
                log.error('ffmpeg error:' + error)
                reject(error)
            })
            .on('stderr', function (stderrLine) {
                log.verbose('Stderr output:' + stderrLine)
            })
            .on('start', function (commandLine) {
                log.info('FFmpeg command: ' + commandLine)
                log.verbose('FFmpeg command:', commandLine)
            })
            .on('end', () => {
                resolve()
            })
            this.setInputOption()
            this.setOutputOption()
            // monitor downloading process
            this.monitorProcess(listenProcess)
            // set the transform file suffix
            this.ffmpegCmd.format(this.OUTPUTFORMAT || 'mp4')
            // start  mission
            this.ffmpegCmd.run()
        })
    }

    // kill the process
    kill (signal = 'SIGKILL') {
        // SIGSTOP pause download
        // SIGCONT resume download
        // SIGKILL 
        this.ffmpegCmd?.kill(signal)
    }
}
module.exports = FfmpegHelper
