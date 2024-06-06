import fs from 'fs';
import common from "../../lib/common/common.js"

const gameDataPath = 'data/.AAA 电子木鱼游戏数据'
fs.mkdirSync(`${gameDataPath}/用户`, { recursive: true });
fs.mkdirSync(`${gameDataPath}/记录`, { recursive: true });
export class example extends plugin {
    constructor() {
        super({
            name: '[Game]电子木鱼',
            dsc: 'example',
            event: 'message',
            priority: 1,
            rule: [
                { reg: /^(#|\/)?敲木鱼$/, fnc: 'F1' },
                { reg: /^(#|\/)?(今日|本群(今日)?)?功德榜/, fnc: 'F2' },
                { reg: /^(#|\/)?木鱼记录$/, fnc: 'F3' }
            ]
        })
    }

    async F1(e) {
        /** 用户ID */
        const userId = e.user_id
        /** 群ID */
        const groupId = e.group_id
        /** 今日日期 */
        const todayDate = getTodayDate()
        /** 文件路径 */
        const filePath = {
            user: `${gameDataPath}/用户/${userId}.json`,
            todayRecord: `${gameDataPath}/记录/${todayDate}.json`
        }
        /** 用户数量 */
        const userNumber = fs.readdirSync(`${gameDataPath}/用户`)['length'] + 100001

        // 判断用户是否存在，不存在创建基础信息
        if (!fs.existsSync(filePath['user'])) {
            storeJson(filePath['user'], {
                N: userNumber,
                ID: userId,
                GID: groupId,
                nickname: e.sender.nickname,
                total: 0,
                Historical: {}
            })
        }

        // 判断今日是否有记录，没有则创建今日记录
        if (!fs.existsSync(filePath['todayRecord'])) {
            storeJson(filePath['todayRecord'], {
                total: 0,
                group: [],
                user: []
            })
        }

        /** 用户数据 */
        const userData = await getJsonData(filePath['user'])
        /** 今日数据 */
        const todayData = await getJsonData(filePath['todayRecord'])

        userData['total'] += 1
        userData['Historical'][todayDate] = (userData['Historical'][todayDate] || 0) + 1
        let Tips = ''; if (!todayData['group'].includes(groupId)) {
            Tips = `今日第 ${todayData['group']['length'] + 1} 个敲击木鱼的群\n`
            todayData['group'].push(groupId)
        }
        if (!todayData['user'].includes(userId)) {
            Tips += `今日第 ${todayData['user']['length'] + 1} 位敲击木鱼的用户\n`
            todayData['user'].push(userId)
        }
        todayData['total'] += 1
        storeJson(filePath['user'], userData)
        storeJson(filePath['todayRecord'], todayData)

        e.reply([
            `${Tips}木鱼今日总敲击次数${todayData['total']}\r您今日已敲击 ${userData['Historical'][todayDate]} 次\r累计功德 ${userData['total']}`
        ])
    }

    async F2(e) {
        const groupId = e.group_id;
        const rankingType = e.msg.match(/^(#|\/)?(今日|本群(今日)?)?功德榜$/)[2];
        const fileList = fs.readdirSync(`${gameDataPath}/用户`);
        const todayDate = getTodayDate();

        const rankingData = await Promise.all(fileList.map(async (userFile) => {
            const userFilePath = `${gameDataPath}/用户/${userFile}`;
            const userData = await getJsonData(userFilePath);

            if (rankingType === '本群') {
                if (userData['GID'] === groupId) {
                    return { A: userData['total'], B: userData['ID'], C: userData['nickname'] }
                } else {
                    return null
                }
            } else if (rankingType === '本群今日') {
                if (userData['GID'] === groupId) {
                    if (userData['Historical'][todayDate]) {
                        return { A: userData['total'], B: userData['ID'], C: userData['nickname'] }
                    } else {
                        return null
                    }
                } else {
                    return null
                }
            } else if (rankingType === '今日') {
                if (userData['Historical'][todayDate]) {
                    return { A: userData['total'], B: userData['ID'], C: userData['nickname'] }
                } else {
                    return null
                }
            } else {
                return { A: userData['total'], B: userData['ID'], C: userData['nickname'] }
            }
        }));

        const filteredRankingData = rankingData.filter(data => data !== null);
        filteredRankingData.sort((a, b) => b.A - a.A);
        const topRankingData = filteredRankingData.slice(0, 10);
        const msgArr = []
        for (let i = 0; i < topRankingData.length; i++) {
            let msg = []
            msg.push(segment.image(`https://q1.qlogo.cn/g?b=qq&nk=${topRankingData[i]['B']}&s=160`))
            msg.push(
                `Top${i + 1}. ${topRankingData[i]['C']}\n`,
                `功德: [${topRankingData[i]['A']}]`
            )
            msgArr.push(msg)
        }

        e.reply(await common.makeForwardMsg(e, msgArr, `${!rankingType ? '' : rankingType}功德榜`));
    }


    async F3(e) {
        const userId = e.user_id
        const groupId = e.group_id
        const userNumber = fs.readdirSync(`${gameDataPath}/用户`)['length'] + 100001
        const userFilePath = `${gameDataPath}/用户/${userId}.json`
        const todayDate = getTodayDate()

        if (!fs.existsSync(userFilePath)) {
            storeJson(userFilePath, {
                N: userNumber,
                ID: userId,
                GID: groupId,
                nickname: e.adapter === 'QQBot' ? `木鱼用户${userNumber}号` : e.sender.nickname,
                total: 0,
                Historical: {}
            })
        }

        const userData = await getJsonData(userFilePath)

        e.reply([
            segment.at(userId),
            `\n功德: [${userData['total']}]`,
            `\n今日敲击次数: [${!userData['Historical'][todayDate] ? 0 : userData['Historical'][todayDate]}]`,
            `\n累计敲击天数: [${Object.keys(userData['Historical']).length}]`
        ])
    }
}

/**
 * 存储JSON
 * @param {string} filePath 
 * @param {JSON} data 
 */
function storeJson(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log('数据已成功写入文件：' + filePath);
    } catch (err) {
        console.error('写入文件时发生错误：', err);
    }
}

/**
 * 读取JSON数据
 * @param {string} filePath JSON文件路径
 * @returns {JSON}
 */
async function getJsonData(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/** 
 * 得到今日年月日
 * @returns {string}
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}