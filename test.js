/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media')
oi.ready().then(() => {
    const url = 'https://s8.fsvod1.com/20230524/bW0SZkHJ/index2.m3u8'
    oi.createDownloadMission({ name: 'wolai', url, outputformat: 'flv' }).then(() => {
        console.log('下载成功')
    }).catch(e =>
        console.log('download failed：' + e),
    )
    // eslint-disable-next-line max-len
    // oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
    //     console.log(res)
    // }).catch(err => console.log(err))
})