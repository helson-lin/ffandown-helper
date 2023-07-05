/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
 */
const Oimi = require('./src/index')

const oi = new Oimi('media')

oi.ready().then(() => {
    const url = 'https://ikcdn01.ikzybf.com/20221105/NnkGg9ak/index.m3u8'
    oi.createDownloadMission({ url }).then(() => {
        console.log('下载成功')
    }).catch(e =>
        console.log('download failed：' + e),
    )
})