# oimi-helper

this package is server for ffandown

## What is this???

This is an FFandDown dependency package that can be used to download and stream live websites using m3u8 playlists.


## How to use?

```bash
npm install oimi-helper
```

## Example

```js

const oi = new Oimi('media')
oi.ready().then(() => {
    // download m3u8
    const url = 'https://s8.fsvod1.com/20230524/bW0SZkHJ/index2.m3u8'
    oi.createDownloadMission({ name: 'example', url, outputformat: 'mp4' }).then(() => {
        console.log('download success')
    }).catch(e =>
        console.log('download failed：' + e),
    )
    // parser live
    oi.parserUrl('3- #在抖音，记录美好生活#【luckincoffee瑞幸咖啡】正在直播，来和我一起支持Ta吧。复制下方链接，打开【抖音】，直接观看直播！ https://v.douyin.com/ib3UfqM/').then((res) => {
        console.log(res)
    }).catch(err => console.log(err))
})
```