/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media', { 
    verbose: false, 
    maxDownloadNum: 1,
})

oi.registerEventCallback((eventInfo) => {
    console.log('registerEventCallback', eventInfo)
})

oi.ready().then(async () => {
    // eslint-disable-next-line max-len
    // const urls = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8'
    oi.createDownloadMission({ 
        name: 'movie',
        url: 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall23.m3u8',
        useragent: 'iPhone',
        outputformat: 'mp4', 
        dir: '/live',
    }).then((res) => {
        // make it with success download;
        // mission create;
        console.log('download success', res)
    }).catch(e =>
        console.log('download failed:' + e),
    )

    // oi.createDownloadMission({ 
    //     name: '12212312321',
    //     url: 'https://cn-jstz-cu-01-03.bilivideo.com/upgcxcode/05/72/1565667205/1565667205-1-100027.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&uipk=5&nbs=1&deadline=1717166276&gen=playurlv2&os=bcache&oi=0&trid=00006a509e7c2d404c7692400594e9e7f2d6u&mid=58422276&platform=pc&og=cos&upsig=3d928321d417a20b2446a18fe2f48b94&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,mid,platform,og&cdnid=71703&bvc=vod&nettype=0&orderid=0,3&buvid=9FC90015-7294-8367-5283-7142D9DA318F20544infoc&build=0&f=u_0_0&agrr=0&bw=91472&logo=80000000',
    //     outputformat: 'mp4', 
    //     dir: '/live',
    //     enableTimeSuffix: true,
    // }, () => {}).then(() => {
    //     console.log('download success')
    //     setTimeout(() => {
    //         oi.killAll()
    //     }, 300000)
    // }).catch(e =>
    //     console.log('download failed:' + e),
    // )
    
    // oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
    //     console.log(res)
    // }).catch(err => console.log(err))
    // oi.deleteMission(['c75dd5da-cf08-4476-800b-9636b08acb6e', '9c8a53c4-5305-46ad-abef-45726bbb03cf']).then((res) => {
    //     console.log(res, 'res')
    // }).catch(e => { console.log('error', e) }) 
})