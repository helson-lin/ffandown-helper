/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media', { verbose: true })

oi.ready().then(() => {
    // eslint-disable-next-line max-len
    // const urls = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8'
    oi.createDownloadMission({ 
        name: '123',
        url: 'https://files.yuchenglw.com/index/m3u8/id/26241',
        useragent: 'iPhone',
        outputformat: 'mp4', 
    }).then(() => {
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
    // eslint-disable-next-line max-len
    // oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
    //     console.log(res)
    // }).catch(err => console.log(err))
})