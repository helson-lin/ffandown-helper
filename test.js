/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media', { verbose: false, maxDownloadNum: 1 })

oi.ready().then(async () => {
    // eslint-disable-next-line max-len
    // const urls = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8'
    oi.createDownloadMission({ 
        name: '123',
        url: 'rtsp://rtspstream:aae9ca382fa392561ff0ec3392eb39ec@zephyr.rtsp.stream/movie',
        useragent: 'iPhone',
        outputformat: 'mp4', 
    }).then(() => {
        console.log('download success')
    }).catch(e =>
        console.log('download failed:' + e),
    )

    oi.createDownloadMission({ 
        name: '123',
        url: 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8',
        useragent: 'iPhone',
        outputformat: 'mp4', 
    }).then(() => {
        console.log('download success')
    }).catch(e =>
        console.log('download failed:' + e),
    )
    
    // oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
    //     console.log(res)
    // }).catch(err => console.log(err))
})