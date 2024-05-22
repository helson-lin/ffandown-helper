/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media', { verbose: true, maxDownloadNum: 1 })

oi.ready().then(async () => {
    // eslint-disable-next-line max-len
    // const urls = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8,http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8'
    // oi.createDownloadMission({ 
    //     name: 'movie',
    //     url: 'rtsp://rtspstream:aae9ca382fa392561ff0ec3392eb39ec@zephyr.rtsp.stream/movie',
    //     useragent: 'iPhone',
    //     outputformat: 'mp4', 
    //     dir: '/live',
    // }).then(() => {
    //     console.log('download success')
    // }).catch(e =>
    //     console.log('download failed:' + e),
    // )

    oi.createDownloadMission({ 
        name: 'tmp23',
        url: 'https://d1--cn-gotcha204-3.bilivideo.com/live-bvc/633222/live_35461776_3508648/index.m3u8?expires=1716386285&len=0&oi=0x2408824404202e7d248ecad1298921dc&pt=web&qn=0&trid=10077044a78ec13e4d63b8c83f1e4c04de43&sigparams=cdn,expires,len,oi,pt,qn,trid&cdn=cn-gotcha204&sign=5fc89f65fd355ad90ddc5af39016ea09&sk=5948758c28e5566e8ee5996d8c78f5e2&p2p_type=1&sl=1&free_type=0&mid=58422276&pp=rtmp&source=onetier&trace=20&site=e2b68fe95a62792e35e47a712a54f71d&qp=de_0&order=1',
        useragent: 'iPhone',
        outputformat: 'mp4', 
        dir: '/live',
        enableTimeSuffix: false,
    }, () => {}).then(() => {
        console.log('download success')
        setTimeout(() => {
            oi.killAll()
        }, 15000)
    }).catch(e =>
        console.log('download failed:' + e),
    )
    
    // oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
    //     console.log(res)
    // }).catch(err => console.log(err))
    // oi.deleteMission(['c75dd5da-cf08-4476-800b-9636b08acb6e', '9c8a53c4-5305-46ad-abef-45726bbb03cf']).then((res) => {
    //     console.log(res, 'res')
    // }).catch(e => { console.log('error', e) }) 
})