/**
 * @description M3U8 to MP4 Converter
 * @author Furkan Inanc, Helson Lin
 * @version 1.0.0
 */
const ffmpeg = require('fluent-ffmpeg')
const log = require('../utils/logger')
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
    setInputFile (M3U8_FILE) {
        if (!M3U8_FILE) throw new Error('You must specify the M3U8 file address')
        this.M3U8_FILE = M3U8_FILE
        this.PROTOCOL_TYPE = this.getProtocol(this.M3U8_FILE)
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
      * 获取地址协议
      * @date 3/30/2023 - 11:50:14 AM
      * @param {string} url
      * @returns {("live" | "m3u8" | "mp4" | "unknown")}
      */
    getProtocol (url) {
        switch (true) {
            case url.startsWith('rtmp://'):
            case url.startsWith('rtsp://'):
                return 'live'
            case url.indexOf('.m3u8') !== -1:
            case url.indexOf('.flv') !== -1:
                return 'm3u8'
            default:
                return 'unknown'
        }
    }

    setInputOption () {
        // eslint-disable-next-line max-len
        const USER_AGENT = this.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
        const REFERER_RGX = /^(?<referer>http|https:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d+)?\/[^ "]+$/u
        const match = this.M3U8_FILE.match(REFERER_RGX)
        const [referer] = match === null ? ['unknown'] : match.slice(1)
        this.ffmpegCmd.inputOptions(
            [
                '-user_agent',
                `${USER_AGENT}`,
                '-referer',
                `${referer}/`,
            ],
        )
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
        if (liveProtocol === 'live') {
            this.ffmpegCmd
            .outputOptions('-c:v copy')
            .outputOptions('-c:a copy')
            // .outputOptions('-c:a aac')
            // .outputOptions('-b:a 128k')
            .output(this.OUTPUT_FILE)
        } else if (liveProtocol === 'm3u8') {
            this.ffmpegCmd
            .outputOptions('-c:v copy')
            .outputOptions('-c:a copy')
            // .outputOptions('-c:v copy')
            // .outputOptions('-bsf:a aac_adtstoasc')
            .output(this.OUTPUT_FILE)
        }
    }

    monitorProcess (callback) {
        this.ffmpegCmd.ffprobe((err, data) => {
            if (err) {
                // log.warn(`Error: ${err.message}`)
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
            const { duration } = data.format
            this.ffmpegCmd
            .on('progress', (progress) => {
                // TODO：速度优化
                const percent = toFixed((progress.percent * 100) / 100)
                const processedDuration = duration * (progress.percent / 100)
                const remainingDuration = duration - processedDuration
                const currentMbs = formatSpeed(progress.currentKbps)
                if (callback && typeof callback === 'function') {
                    const params = {
                        percent: percent >= 100 ? 100 : percent,
                        process: toFixed(processedDuration),
                        remaining: toFixed(remainingDuration),
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
    * Starts the process
    */
    start (listenProcess) {
        return new Promise((resolve, reject) => {
            if (!this.M3U8_FILE || !this.OUTPUT_FILE) {
                reject(new Error('You must specify the input and the output files'))
                return
            }
            if (this.PROTOCOL_TYPE === 'unknown') {
                reject(new Error('the protocol is not supported, please specify the protocol type: m3u8 or rtmp、 rtsp'))
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
                log.warn('Spawned Ffmpeg with command: ' + commandLine)
            })
            .on('end', () => {
                resolve()
            })
            this.setInputOption()
            this.setOutputOption()
            this.monitorProcess(listenProcess)
            this.ffmpegCmd.format(this.OUTPUTFORMAT || 'mp4') 
            this.ffmpegCmd.run()
        })
    }

    // kill the process
    kill (signal = 'SIGKILL') {
        // SIGSTOP pause download
        // SIGCONT resume download
        // SIGKILL 
        this.ffmpegCmd.kill(signal)
    }
}
module.exports = FfmpegHelper
