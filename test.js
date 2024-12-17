/**
 * @test url: http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8 / https://v11.dious.cc/20241207/ZnuvcF6m/index.m3u8
 * @test url: https://0472.org/hls/cgtn.m3u8 live
 * @test url: https://english-livetx.cgtn.com/hls/yypdyyctzb_hd.m3u8 live
 */
const Oimi = require('./src/index')

const oi = new Oimi('media', { 
    verbose: false, 
    maxDownloadNum: 1,
    thread: false,
})

oi.ready().then(async () => {
    console.log('ready for')
    oi.createDownloadMission({ 
        name: 'live23',
        url: 'https://english-livetx.cgtn.com/hls/yypdyyctzb_hd.m3u8',
        // url: 'https://0472.org/hls/cgtn.m3u8',
        useragent: 'iPhone',
        outputformat: 'mp4', 
        dir: '/live',
    }).then((res) => {
        console.log('download success')
        setTimeout(() => {
            oi.stopDownload(res.uid).then((code) => {
                if (code === 0) console.log('终止成功', code)
                else console.log('失败了')
            }).catch((e) => {
                console.log('执行错误', e)
            })
        }, 90000)
    }).catch(e =>
        console.log('download failed:' + e),
    )
})