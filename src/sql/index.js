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
            const download = await SysDownloadDb.create({ ...body })
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
            const download = await SysDownloadDb.update(body, { where: { uid } })
            return Promise.resolve(download)
        } catch (e) {
            console.log('update failed', e)
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
}

module.exports = dbOperation