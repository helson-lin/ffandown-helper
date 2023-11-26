/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media')
oi.ready().then(() => {
    const url = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8'
    oi.createDownloadMission({ name: 'wolai', url, outputformat: 'flv' }).then(() => {
        console.log('download success')
    }).catch(e =>
        console.log('download failed:' + e),
    )
    // setTimeout(async () => {
    //     const mission = oi.missionList[oi.missionList.length - 1]
    //     // mission && oi.deleteMission(mission.uid).then((res) => {
    //     //     console.log(res)
    //     // })
    //     await oi.pauseMission(mission.uid)
    //     setTimeout(async () => {
    //         await oi.resumeDownload(mission.uid)
    //     }, 20000)
    // }, 18000)
    // setTimeout(() => {
    //     oi.killAll()
    // }, 13000)
    // eslint-disable-next-line max-len
    // oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
    //     console.log(res)
    // }).catch(err => console.log(err))
})