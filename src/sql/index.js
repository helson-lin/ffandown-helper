const { SysDownloadDb, sequelize } = require('./entity')
const dbOperation = {
    async sync () {
        try {
            await sequelize.sync()
            console.log('Database synced successfully')
        } catch (e) {
            console.log('Database synced failed:' + String(e).trim())
        }
    },
    /**
     * @description create download record
     * @param {*} param {uid, name, url, percent, filePath, status, speed} 
     * @returns 
     */
    async create (body) {
        try {
            const time = new Date().toLocaleString()
            const download = await SysDownloadDb.create({ ...body, crt_tm: time, upd_tm: time })
            return Promise.resolve(download)
        } catch (e) {
            return Promise.reject(e)
        }
    },
    async delete (uid) {
        try {
            const deletedRes = await SysDownloadDb.destroy({ where: { uid } })
            return Promise.resolve(deletedRes)
        } catch (e) { 
            return Promise.reject(e)
        }
    },
    async update (uid, body) {
        try {
            const mission = body
            if (!mission.crt_tm) mission.crt_tm = new Date().toLocaleString()
            if (!mission.upd_tm) mission.upd_tm = new Date().toLocaleString()
            const download = await SysDownloadDb.update(mission, { where: { uid } })
            return Promise.resolve(download)
        } catch (e) {
            return Promise.reject(e)
        }
    },
    async getAll () {
        try {
            const all = await SysDownloadDb.findAll()
            return Promise.resolve(all)
        } catch (e) {
            return Promise.reject(e)
        }
    },
    async queryOne (uid) {
        try {
            const mission = await SysDownloadDb.findOne({ where: { uid } })
            return Promise.resolve(mission)
        } catch (e) {
            return Promise.reject(e)
        }
    },
}

module.exports = dbOperation