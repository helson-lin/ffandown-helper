const FfmpegHelper = require('./core/index')
const helper = require('./utils/helper')
const dbOperation = require('./sql/index')
const path = require('path')
const os = require('os')
const { v4: uuidv4 } = require('uuid')
const throttle = require('lodash.throttle')
const log = require('./utils/logger')
require('dotenv').config()

class Oimi {
    OUTPUT_DIR
    maxDownloadNum
    thread
    missionList
    parserPlugins
    helper
    verbose
    dbOperation
    // event callback
    stopMission
    resumeMission
    eventCallback
    constructor (OUTPUT_DIR, { thread = true, verbose = false, maxDownloadNum = 5, eventCallback }) {
        this.helper = helper
        this.dbOperation = dbOperation
        if (OUTPUT_DIR) this.OUTPUT_DIR = this.helper.ensurePath(OUTPUT_DIR)
        this.missionList = []
        // 终止的任务
        this.stopMission = []
        this.resumeMission = []
        this.parserPlugins = []
        this.thread = thread && this.getCpuNum()
        this.maxDownloadNum = maxDownloadNum || 5
        this.verbose = verbose
        this.eventCallback = eventCallback
    }

    /**
     * @description register event callback | 注册回调事件
     * @param {function} eventCallback
     */
    registerEventCallback (eventCallback) {
        if (eventCallback && typeof eventCallback === 'function') {
            this.eventCallback = eventCallback
        }
    }

    /**
      * @description callback mission status | 回调下载任务的状态
     * @param {object} data 
     * @returns {void} 
     */
    callbackStatus (data) {
        if (this.eventCallback && typeof this.eventCallback === 'function') {
            this.eventCallback(data)
        }
    }

    /**
     * @description before create mission need operation: download dependency and sync db data ｜ 准备工作
     * @returns void
     */

    async ready () {
        await this.helper.downloadDependency()
        await this.dbOperation.sync()
        await this.initMission()
    }

    /**
     * @description get current device cpu numbers
     * @returns {number} cpu numbers
     */

    getCpuNum () {
        return os.cpus().length
    }

    throttleUpdate (uid, data) {
        this.updateMission(uid, data)
    }

    /**
     * @description get file download path by name
     * @param {string} name
     * @param {string} dir
     * @param {string} outputFormat
     * @param {boolean} enableTimeSuffix
     * @returns {{fileName: string, filePath: string}} path
     */
    getDownloadFilePathAndName (name, dir, outputFormat, enableTimeSuffix = false) {
        const tm = String(new Date().getTime())
        let fileName = name ? name.split('/').pop() : tm
        const dirPath = path.join(this.OUTPUT_DIR ?? process.cwd(), dir ?? '')
        this.helper.ensureMediaDir(dirPath)
        const getFileName = () => {
            const fileFormat = outputFormat || 'mp4'
            if (name && enableTimeSuffix) return name + '_' + tm + `.${fileFormat}`
            if (name && !enableTimeSuffix) return name + `.${fileFormat}`
            return tm + `.${fileFormat}`
        }
        const filePath = path.join(dirPath, getFileName())
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
        // status 任务更新为的状态
        try {
            // 下载任务管理内存在下载任务
            if (oldMission) {
                // 如果下载没有完成，并且当前下载任务的状态不是完成状态, 更新任务的状态
                // console.log(finish, status, oldMission.status)
                if (!finish && !['2', '3', '4'].includes(status) && !['2', '3', '4'].includes(oldMission.status)) {
                    oldMission.status = status || '1' // 更新任务的状态：如果状态丢失那么默认为初始化状态
                    await this.dbOperation.update(uid, { name, percent, speed: currentMbs, timemark, size: targetSize, message, status: status || '1' })
                    this.callbackStatus({ uid, status: status || '1' })
                } else if ((finish || ['3', '4'].includes(status)) && status !== 2) {
                    // 更新任务状态为下载完成(下载失败)：只需要更新下载状态
                    oldMission.status = status
                    const updateOption = { status: oldMission.status }
                    if (status === '3') updateOption.percent = '100'
                    if (status === '4') updateOption.message = message
                    await this.dbOperation.update(uid, updateOption)
                    this.callbackStatus({ uid, status: updateOption.status })
                    // 从missionList内移除任务
                    this.missionList = this.missionList.filter(i => i.uid !== uid)
                } else if (!finish && status === '2') {
                    // 停止下载
                    oldMission.status = '2'
                    await this.dbOperation.update(uid, { status: '2' })
                    this.callbackStatus({ uid, status: '2' })
                    // console.log(this.stopMission, uid)
                    if (this.stopMission.findIndex(i => i.uid === uid) !== -1) {
                        const missionToStop = this.stopMission.find(i => i.uid === uid)
                        missionToStop && missionToStop?.callback()
                    }
                }
            } else {
                console.log('oldMission 没有')
                // 如果没有下载任务管理内不存在任务
                await this.dbOperation.update(uid, { name, percent, speed: currentMbs, timemark, size: targetSize, message, status: status || '1' })
                this.callbackStatus({ uid, status: status || '1' })
            }
            // finish为True,表示有下载任务完成，那么可以添加新的下载任务到任务管理内, 或者 status为4/3的时候去添加下载任务
            // 如果用户手动继续下载任务
            // if (finish || ['4', '3'].includes(status)) this.insertNewMission()
        } catch (e) {
            log.error(e)
        }
    }

    /**
     * @description insert download mission to database for waiting download
     * @async
     * @param {*} mission
     * @returns {*}
     */
    async insertWaitingMission (mission) {
        await this.dbOperation.create(mission)
    }
    
    /**
     * @description 初始化任务：继续下载没有完成的任务，并且如果任务数量没有超过限制，添加等待的下载任务
     * @async
     * @returns {*}
     */
    async initMission () {
        const allMissions = await this.dbOperation.queryMissionByType('needResume')    
        // 继续恢复下载任务     
        const missions = allMissions.slice(0, this.maxDownloadNum)
        for (let mission of missions) {
            const ffmpegHelper = new FfmpegHelper({ VERBOSE: this.verbose })
            this.missionList.push({ ...mission.dataValues, ffmpegHelper })
            console.log('initMission for start download')
            await this.startDownload({ ffmpegHelper, mission, outputformat: '', preset: mission.preset }, false)
        }
    }

    /**
     * @description insert new mission from waiting mission list
     * @date 2024/2/23 - 22:55:39
     * @param {*} mission
     */
    async insertNewMission () {
        console.log('insertNewMission')
        const waitingMissions = await this.dbOperation.queryMissionByType()
        const missionListLen = this.missionList.length
        // 插入的任务的数量
        const insertMissionNum = this.maxDownloadNum - missionListLen
        if (waitingMissions.length > 0) {
            const insertMissions = waitingMissions.slice(0, insertMissionNum)
            for (let mission of insertMissions) {
                console.log('add new mission')
                const ffmpegHelper = new FfmpegHelper({ VERBOSE: this.verbose })
                // mission.dataValues is json data
                this.missionList.push({ ...mission.dataValues, ffmpegHelper })
                await this.startDownload({ ffmpegHelper, mission, outputformat: '', preset: mission.preset }, false)
            }
        }
    }

    /**
     * @description 开始下载任务
     *
     * */
    async startDownload ({ mission, ffmpegHelper, outputformat, preset }, isNeedInsert = true) {
        console.log('startDownload')
        const uid = mission.uid
        try {
            if (isNeedInsert) await this.dbOperation.create(mission)
            ffmpegHelper.setInputFile(mission.url, mission.useragent)
            if (ffmpegHelper.PROTOCOL_TYPE === 'unknown') {
                throw new Error('this url is not supported to download')
            } else {
                console.log('创建下载任务')
                ffmpegHelper.setOutputFile(mission.filePath)
                .setUserAgent(mission.useragent)
                .setThreads(this.thread)
                .setPreset(preset)
                .setOutputFormat(outputformat)
                .start(params => {
                    console.log('开始下载', mission.uid)
                    // 实时更新任务信息
                    this.throttleUpdate(uid, { ...mission, status: params.percent >= 100 ? '3' : '1', ...params })
                }).then(() => {
                    // todo: create download mission support downloaded callback
                    this.updateMission(uid, { ...mission, percent: 100, status: '3' }, true)
                }).catch((e) => {
                    console.log('catch error', String(e))
                    // 下载中发生错误
                    if (!['Exiting normally, received signal 2', 'ffmpeg was killed with signal SIGKILL', 'ffmpeg exited with code'].some(code => String(e).indexOf(code) !== -1)) {
                        this.updateMission(uid, { ...mission, status: '4', message: String(e) })
                        log.warn('downloading error:', e)
                    } else if (String(e).indexOf('ffmpeg was killed with signal SIGKILL') !== -1) {
                        // 任务被暂停
                        this.updateMission(uid, { ...mission, status: '2', message: 'mission stopped' })
                    } else {
                        console.log('error excetpted', e)
                    }
                })
                return 'mission created'
            }
        } catch (e) {
            log.warn('downloading error:', e)
            await this.updateMission(uid, { ...mission, status: '4', message: String(e) })
        }
    }

    /**
     * @description create download mission
     * @param {object} query url: download url, name: download mission name outputformat
     */
    async createDownloadMission (query) {
        let enableTimeSuffix = false
        const { name, url, outputformat, preset, useragent, dir } = query
        if (query?.enableTimeSuffix !== undefined && typeof query?.enableTimeSuffix === 'boolean') enableTimeSuffix = query.enableTimeSuffix
        if (!url) throw new Error('url is required')
        const { fileName, filePath } = this.getDownloadFilePathAndName(name, dir, outputformat, enableTimeSuffix)
        const mission = { 
            uid: uuidv4(),
            name: fileName,
            url,
            status: '0',  
            filePath,
            percent: 0,
            message: '',
            useragent,
        }
        // over max download mission
        if (this.missionList.length >= this.maxDownloadNum) {
            console.log('over max download mission')
            mission.status = '5' // set mission status is waiting
            await this.insertWaitingMission(mission)
            return { uid: mission.uid }
        } else {
            // continue download
            console.log('start downloading mission')
            // 创建下载任务实例
            const ffmpegHelper = new FfmpegHelper({ VERBOSE: this.verbose })
            this.missionList.push({ ...mission, ffmpegHelper })
            await this.startDownload({ ffmpegHelper, mission, outputformat, preset })
            return { uid: mission.uid, ffmpegHelper }
        }
    }
    
    /**
    * @description pause download mission / 暂停下载任务
    * @param {string} uid
    */
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

    /**
    * @description resume download mission/恢复下载任务
    * @param {string} uid
    */
    resumeDownload (uid) {
        return new Promise((resolve, reject) => {
            (async () => {
                // 恢复下载任务存在两种情况 missionList里面已经存在数据 直接调用kill('恢复')
                const mission = this.missionList.find(i => i.uid === uid)
                if (mission) {
                    mission.ffmpegHelper.kill('SIGCONT')
                    resolve('resume download')
                } else {
                    const mission = await this.dbOperation.queryOne(uid)
                    if (mission) {
                        try {
                            const suffix = this.helper.getUrlFileExt(mission.filePath)
                            const ffmpegHelper = new FfmpegHelper()
                            this.missionList.push({ ...mission, ffmpegHelper })
                            await ffmpegHelper.setInputFile(mission.url)
                            .setOutputFile(mission.filePath)
                            .setThreads(this.thread)
                            .setTimeMark(mission.timemark)
                            .setOutputFormat(suffix)
                            .start(params => {
                                console.log('开始下载2', mission.uid)
                                this.throttleUpdate(uid, {
                                    ...mission, 
                                    ...params,
                                    status: params.percent >= 100 ? '3' : '1',
                                })
                                resolve('resume download')
                            }).then(() => {
                                // todo: create download mission support downloaded callback
                                this.updateMission(uid, { ...mission, percent: 100, status: '3' }, true)
                            }).catch(e => {
                                console.log('catch error', String(e))
                                if (!['Exiting normally, received signal 2', 'ffmpeg was killed with signal SIGKILL'].some(code => String(e).indexOf(code) !== -1)) {
                                    this.updateMission(uid, { ...mission, status: '4', message: String(e) })
                                    log.warn('downloading error:', e)
                                } else if (String(e).indexOf('ffmpeg was killed with signal SIGKILL') !== -1) {
                                    // 任务被暂停
                                    this.updateMission(uid, { ...mission, status: '2', message: 'mission stopped' })
                                } else {
                                    console.log('error', e)
                                }
                            })
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
    
    /**
     * @description delete download mission / 删除下载任务v
     * @param {string} uid
     */
    deleteDownload (uid) {
        return new Promise((resolve, reject) => {
            try {
                // 存在正在进行中的任务，那么需要将任务暂停并且删除掉
                const missionIndex = this.missionList.findIndex(i => i.uid === uid)
                if (missionIndex !== -1) {
                    const mission = this.missionList[missionIndex]
                    mission.ffmpegHelper.kill('SIGKILL')
                    // 删除任务
                    this.missionList.splice(missionIndex, 1)
                    // 数据库内删除
                }
                this.dbOperation.delete(uid).then(() => resolve()).catch(e => reject(e))
            } catch (e) {
                reject(e)
            }
        })
    }

    /**
     * @description stop mission download,  mission can be play event though it's not finished download / 终止下载任务
     * @param {strig} uid 
     */
    stopDownload (uid) {
        console.log('stopDownload', uid)
        return new Promise((resolve, reject) => {
            try {
                const missionIndex = this.missionList.findIndex(i => i.uid === uid)
                if (missionIndex !== -1) {
                    const mission = this.missionList[missionIndex]
                    console.log('stop', mission.uid)
                    // SIGKILL 下载， 这里需要判断下载任务的类型，才可以使用不同的终止方式
                    mission.ffmpegHelper.kill()
                    this.stopMission.push({
                        uid,
                        callback: () => {
                            console.log('成功终止')
                            resolve(0)
                        },
                    })
                } else {
                    console.log('stop2', this.missionList)
                    // if mission is not found return 1
                    resolve(1)
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    /**
    * @description kill all download mission / 杀死所有的下载任务
    */
    async killAll () {
        for (const mission of this.missionList) {
            mission.ffmpegHelper?.ffmpegCmd.kill()
            if (mission && mission.uid && mission.status === '1') {
                try {
                    await this.updateMission(mission.uid, { ...mission, status: '2' })
                } catch (e) {
                    log.warn(e.message)
                }
            }
        }
    }
}

module.exports = Oimi