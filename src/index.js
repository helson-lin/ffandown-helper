const FfmpegHelper = require('./core/index')
const helper = require('./utils/helper')
const dbOperation = require('./sql/index')
const parserList = require('./parser/index')
const path = require('path')
const os = require('os')
const { v4: uuidv4 } = require('uuid')
const throttle = require('lodash.throttle')
const log = require('./utils/logger')
require('dotenv').config()

class Oimi {
    constructor (OUTPUT_DIR, THREAD = true, verbose = false) {
        if (OUTPUT_DIR) this.OUTPUT_DIR = this.helper.ensurePath(OUTPUT_DIR)
        this.missionList = []
        this.THREAD = THREAD && this.getCpuNum()
        this.verbose = verbose
        this.parserPlugins = parserList
    }
    /**
     * @description before create mission need operation: download dependency and sync db data
     * @returns void
     */

    async ready () {
        await this.helper.downloadDependency()
        await this.dbOperation.sync()
    }

    /**
     * @description get current device cpu numbers
     * @returns {number} cpu numbers
     */

    getCpuNum () {
        return os.cpus().length
    }

    /**
     * @description parser special url to the url can be download by ffmpeg
     * @param {string} url  
     * @returns {string} 
     */

    async parserUrl (url) {
        if (!url) {
            throw new Error('url is required')
        }
        const parserPlugin = this.parserPlugins.find((parser) => parser.match(url))
        if (!parserPlugin) {
            return url
        }
        return await parserPlugin.parser(url)
    }

    /**
      * @description get file download path by name
     * @param {string} name 
     * @returns {string} path 
     */
    getDownloadFilePathAndName (name) {
        const fileName = name || new Date().getTime()
        const filePath = path.join(this.OUTPUT_DIR ?? process.cwd(), fileName + '.mp4')
        return { fileName, filePath }
    }
    /**
     * @description update upload mission data/更新下载任务
     * @param {string} uid primary key / 主键 
     * @param {object} info mission information / 任务信息 
     * @param {boolean} finish is finish download mission / 是否完成下载任务
     */

    async updateMission (uid, info, finish = false) {
        const oldMission = this.missionList.find(i => i.uid === uid)
        const { percent, currentMbs, timemark, targetSize, name } = info
        if (!finish) {
            oldMission.status = '1'
            // log.info(`${name}: ${currentMbs} ${percent}% ${targetSize}`)
            await this.dbOperation.update(uid, { percent, speed: currentMbs, timemark, size: targetSize, status: '1' })
        } else {
            oldMission.status = '3'
            log.info(`${name}: finish`)
            await this.dbOperation.update(uid, { status: '3' })
        }
    }

    /**
     * @description create download mission
     * @param {object} query url: download url, name: download mission name
     */
    async createDownloadMission (query) {
        const { name, url } = query
        if (!url) {
            throw new Error('url is required')
        }
        // eslint-disable-next-line no-useless-catch
        try {
            const realUrl = await this.parserUrl(url)
            const { fileName, filePath } = this.getDownloadFilePathAndName(name)
            const uid = uuidv4()
            const ffmpegHelper = new FfmpegHelper()

            const mission = {
                uid,
                name: fileName,
                url: realUrl,
                status: '0',
                filePath,
                percent: 0,
            }

            this.missionList.push({ ...mission, ffmpegHelper })
            await this.dbOperation.create(mission)
            await ffmpegHelper.setInputFile(realUrl)
            .setOutputFile(filePath)
            .setThreads(this.THREAD)
            .start(params => {
                // 实时更新任务信息
                const throttledFunction = throttle(
                    this.updateMission.bind(this, uid, { ...mission, ...params }),
                    2000,
                )
                throttledFunction()
            })
            // mission finish / 下载任务完成
            this.updateMission(uid, mission, true)
            return 'success download'
        } catch (e) {
            throw e
        }
    }
}

Oimi.prototype.helper = helper
Oimi.prototype.dbOperation = dbOperation
module.exports = Oimi