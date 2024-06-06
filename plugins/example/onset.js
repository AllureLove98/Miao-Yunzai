import fetch from 'node-fetch'

export class example extends plugin {
    constructor() {
        super({
            name: '发病语录',
            dsc: 'example',
            event: 'message',
            priority: 1,
            rule: [{
                reg: /#?(发病|发电|发癫|发疯)/,
                fnc: 'fbyl'
            }]
        })
    }

    async fbyl(e) {
        const urlData = await (await fetch('https://oiapi.net/API/SickL/')).json()
        const yl = urlData['message']
        return e.reply((e.adapter === 'QQBot') ? [
            '# 发病语录',
            `> ${yl}`
        ] : [
            segment.at(e.user_id),
            `\n${yl}`
        ])
    }
}