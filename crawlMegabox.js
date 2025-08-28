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
        { name: "Samhwa", code: "0059" }, // 영어 이름으로 변경
        { name: "Ara", code: "0066" }, // 영어 이름으로 변경
        { name: "Seogwipo", code: "0054" } // 영어 이름으로 변경
    ];

    const dates = [];
    const today = new Date(); // 현재 날짜부터 시작
    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}${month}${day}`);
    }

    const megaboxData = {};
    for (const branch of branches) {
        const allSchedulesForBranch = {};
        for (const date of dates) {
            console.log(`Fetching schedules for Megabox ${branch.name} on ${date}...`);
            const movieSchedules = await fetchMegaboxSchedule(branch.code, date);
            allSchedulesForBranch[date] = movieSchedules.map(movie => ({
                movNm: movie.movieNm, // 영화 이름
                movieRating: movie.admisClassCdNm, // 관람 등급
                hallName: movie.theabExpoNm, // 상영관 이름
                scnStartTm: movie.playStartTime, // 상영 시작 시간
                remSeatCnt: movie.restSeatCnt, // 잔여 좌석 수
                scnTypeNm: movie.playKindNm // 상영 타입 (2D, 3D 등)
            }));
        }
        megaboxData[branch.name] = allSchedulesForBranch; // 지점 이름(영어)으로 데이터 저장
    }
    return megaboxData; // 크롤링 결과 반환
}

if (require.main === module) {
    crawlMegabox().then(data => {
        // 이 부분은 crawlAll.js에서 처리할 것이므로, 여기서는 간단히 로그만 남깁니다.
        console.log('Megabox crawling completed. Data:', JSON.stringify(data, null, 2));
    });
}

module.exports = crawlMegabox;