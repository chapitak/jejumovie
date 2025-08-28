const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchMegaboxSchedule(brchNo, playDe) {
    const url = "https://m.megabox.co.kr/on/oh/ohb/SimpleBooking/selectBokdList.do";
    const payload = {
        "menuId": "M-RE-TH-02",
        "sortMthd": "3",
        "flag": "DATE",
        "brchNo1": brchNo,
        "sellChnlCd": "MOBILEWEB",
        "playDe": playDe
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive',
                'Content-Type': 'application/json; charset=UTF-8',
                'Cookie': '_ga=GA1.1.708301514.1755678764; _ga_MLS6F37TQM=GS2.1.s1756371156$o2$g1$t1756371180$j36$l0$h0; SCOUTER=zhq8kuihm82lf; WMONID=VxTXByBZqDO; JSESSIONID=rEfnXGYp25JXjt5y9SpFPQoiAx9QwavaoBhKSZGOILBK7o3ElpVHLoc0yeaQlTbW.b25fbWVnYWJveF9kb21haW4vbWVnYS1vbi1zZXJ2ZXI4; SESSION=NDYxNDM3ZDQtMTQyMy00OGZkLWE4MjctZDU3OGFkNzgwZDA4; _ga_5JL3VPLV2E=GS2.1.s1756371141$o3$g1$t1756371659$j56$l0$h0; _ga_LKZN3J8B1J=GS2.1.s1756371141$o3$g1$t1756371659$j56$l0$h0',
                'Host': 'megabox.co.kr',
                'Origin': 'https://megabox.co.kr',
                'Referer': 'https://megabox.co.kr/on/oh/ohb/SimpleBooking/simpleBookingPage.do?rpstMovieNo=&theabKindCode1=&brchNo1=&sellChnlCd=&playDe=&naverPlaySchdlNo=',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"'
            }
        });

        return response.data.movieFormList || [];
    } catch (error) {
        console.error(`Error fetching Megabox schedule for branch ${brchNo} on ${playDe}:`, error.message);
        return [];
    }
}

async function crawlMegabox() {
    const branches = [
        { name: "제주삼화", code: "0059" },
        { name: "제주아라", code: "0066" },
        { name: "제주서귀포", code: "0054" }
    ];

    const dates = [];
    const today = new Date('2025-08-28'); // Use the provided date as the starting point
    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}${month}${day}`);
    }

    for (const branch of branches) {
        const allSchedulesForBranch = {};
        for (const date of dates) {
            console.log(`Fetching schedules for ${branch.name} on ${date}...`);
            const movieSchedules = await fetchMegaboxSchedule(branch.code, date);
            allSchedulesForBranch[date] = movieSchedules.map(movie => ({
                brchNo: movie.brchNo,
                brchNm: movie.brchNm,
                movieNm: movie.movieNm,
                playStartTime: movie.playStartTime,
                playEndTime: movie.playEndTime,
                theabExpoNm: movie.theabExpoNm,
                restSeatCnt: movie.restSeatCnt,
                totSeatCnt: movie.totSeatCnt,
                admisClassCdNm: movie.admisClassCdNm,
                playKindNm: movie.playKindNm,
                playDe: movie.playDe // Add playDe to each movie object
            }));
        }
        const filePath = path.join(__dirname, 'data', `megabox_${branch.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(allSchedulesForBranch, null, 2), 'utf8');
        console.log(`Megabox ${branch.name} data saved to ${filePath}`);
    }
}

if (require.main === module) {
    crawlMegabox();
}

module.exports = crawlMegabox;