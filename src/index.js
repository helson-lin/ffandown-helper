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
    OUTPUT_DIR
    missionList
    THREAD
    verbose
    parserPlugins
    helper
    dbOperation

    constructor (OUTPUT_DIR, THREAD = true, verbose = false) {
        this.helper = helper
        this.dbOperation = dbOperation
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
        const parserPlugin = this.parserPlugins.find((parser) => parser.handler.match(url))
        if (!parserPlugin) {
            return url
        }
        const parseredInfo = await parserPlugin.handler.parser(url)
        return {
            name: parserPlugin.name,
            data: parseredInfo,
        }
    }

    /**
      * @description get file download path by name
     * @param {string} name 
     * @returns {string} path 
     */
    getDownloadFilePathAndName (name, outputformat) {
        const tm = String(new Date().getTime())
        let fileName = name ? `${name}_${tm}` : tm
        const filePath = path.join(this.OUTPUT_DIR ?? process.cwd(), fileName + `.${outputformat || 'mp4'}`)
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
        const { percent, currentMbs, timemark, targetSize, status, name, message } = info
        if (oldMission) {
            if (!finish && oldMission.status !== '3') {
                oldMission.status = status || '1'
                await this.dbOperation.update(uid, { name, percent, speed: currentMbs, timemark, size: targetSize, message, status: status || '1' })
            } else {
                oldMission.status = '3'
                await this.dbOperation.update(uid, { status: '3' })
            }
        } else {
            await this.dbOperation.update(uid, { name, percent, speed: currentMbs, timemark, size: targetSize, message, status: status || '1' })
        }
    }

    /**
     * @description create download mission
     * @param {object} query url: download url, name: download mission name outputformat
     */
    async createDownloadMission (query) {
        const { name, url, outputformat, preset, useragent } = query
        if (!url) throw new Error('url is required')
        const realUrl = await this.parserUrl(url)
        const { fileName, filePath } = this.getDownloadFilePathAndName(name, outputformat)
        const uid = uuidv4()
        const ffmpegHelper = new FfmpegHelper()

        const mission = {
            uid,
            name: fileName,
            url: realUrl,
            status: '0',
            filePath,
            percent: 0,
            message: '',
            useragent,
        }
        this.missionList.push({ ...mission, ffmpegHelper })
        // eslint-disable-next-line no-useless-catch
        try {
            await this.dbOperation.create(mission)
            await ffmpegHelper.setInputFile(realUrl)
            .setOutputFile(filePath)
            .setUserAgent(useragent)
            .setThreads(this.THREAD)
            .setPreset(preset)
            .setOutputFormat(outputformat)
            .start(params => {
                // 实时更新任务信息
                const throttledFunction = throttle(
                    this.updateMission.bind(this, uid, { ...mission, status: '1', ...params }),
                    2000,
                )
                throttledFunction()
            })
            // mission finish / 下载任务完成
            this.updateMission(uid, mission, true)
            return 'success download'
        } catch (e) {
            this.updateMission(uid, { ...mission, status: '4', message: String(e) })
            throw e
        }
    }

    // 删除任务
    async deleteMission (uid) {
        let inMissonList = true
        let mission = this.missionList.find(i => i.uid === uid)
        if (!mission) {
            inMissonList = false
            mission = await this.dbOperation.queryOne(uid)
        }
        if (mission) {
            inMissonList && mission.ffmpegHelper.kill()
            await this.dbOperation.delete(uid)
            this.helper.removeFile(mission.filePath)    
            return 'mission delete'
        }
        return 'mission not found'
    }

    // 通过uid 暂停任务下载
    async pauseMission (uid) {
        try {
            const mission = this.missionList.find(i => i.uid === uid) 
            if (mission) {
                mission.ffmpegHelper.kill('SIGSTOP')
                this.updateMission(uid, { ...mission, status: '2' })
            }
            return 'mission pause'
        } catch (e) {
            return e
        }
    }

    // 通过uid 恢复下载任务
    resumeDownload (uid) {
        return new Promise((resolve, reject) => {
            (async () => {
                const missionInList = this.missionList.find(i => i.uid === uid)
                if (missionInList) {
                    missionInList.ffmpegHelper.kill('SIGCONT')
                    resolve('resume download')
                } else {
                    // 恢复下载任务存在两种情况 missionList里面已经存在数据 直接调用kill('恢复')
                    const mission = await this.dbOperation.queryOne(uid)
                    if (mission) {
                        try {
                            const suffix = this.helper.getUrlFileExt(mission.filePath)
                            const ffmpegHelper = new FfmpegHelper()
                            this.missionList.push({ ...mission, ffmpegHelper })
                            await ffmpegHelper.setInputFile(mission.url)
                            .setOutputFile(mission.filePath)
                            .setThreads(this.THREAD)
                            .setTimeMark(mission.timemark)
                            .setOutputFormat(suffix)
                            .start(params => {
                                resolve('resume download')
                                const throttledFunction = throttle(
                                    this.updateMission.bind(this, uid, { 
                                        ...mission, 
                                        status: '1', 
                                        ...params }),
                                    2000,
                                )
                                throttledFunction()
                            })
                            this.updateMission(uid, mission, true)
                        } catch (e) {
                            this.updateMission(uid, { ...mission, status: '4', message: String(e) })
                            reject(e)
                        }
                    } else {
                        reject(new Error('mission not found'))
                    }
                }
            })()
        })
    }   

    // 停止所有的任务
    async killAll () {
        for (const mission of this.missionList) {
            mission.ffmpegHelper.kill('SIGSTOP')
            await this.dbOperation.update(mission.uid, { ...mission, status: '2' })
        }
    }
}

module.exports = Oimi