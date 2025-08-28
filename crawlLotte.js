const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // form-data import

async function fetchLotteSchedule(cinemaId, date) {
    const apiUrl = 'https://www.lottecinema.co.kr/LCWS/Ticketing/TicketingData.aspx';

    const formData = new FormData();
    formData.append('paramList', JSON.stringify({
        "MethodName": "GetPlaySequence",
        "channelType": "HO",
        "osType": "W",
        "osVersion": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        "playDate": date, // 동적으로 날짜 설정
        "cinemaID": cinemaId, // 동적으로 cinemaID 설정
        "representationMovieCode": ""
    }));

    const headers = {
        ...formData.getHeaders(), // form-data의 헤더를 가져와 content-type을 설정
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'connection': 'keep-alive',
        'host': 'www.lottecinema.co.kr',
        'origin': 'https://www.lottecinema.co.kr',
        'referer': 'https://www.lottecinema.co.kr/NLCHS/Ticketing/Schedule',
        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
    };

    try {
        const response = await axios.post(apiUrl, formData, { headers: headers });
        const data = response.data;
        // console.log(`Lotte Cinema API response for cinemaId ${cinemaId} on ${date}:`, JSON.stringify(data, null, 2)); // 디버깅용 출력 제거

        let movieSchedules = [];
        if (data && data.PlaySeqs && Array.isArray(data.PlaySeqs.Items)) {
            data.PlaySeqs.Items.forEach(item => {
                movieSchedules.push({
                    movNm: item.MovieNameKR, // 영화 이름
                    movieRating: item.ViewGradeNameKR, // 관람 등급
                    hallName: item.ScreenNameKR, // 상영관 이름
                    scnStartTm: item.StartTime, // 상영 시작 시간
                    remSeatCnt: item.TotalSeatCount - item.BookingSeatCount, // 잔여 좌석 수 계산
                    scnTypeNm: item.FilmNameKR // 상영 타입 (2D, 3D 등)
                });
            });
        }
        return movieSchedules;
    } catch (error) {
        console.error(`Error fetching Lotte Cinema schedule for site ${cinemaId} on ${date}:`, error.message);
        return [];
    }
}

async function crawlLotte() {
    const branches = [
        { name: "JejuYeonDong", id: "1|0007|6010" },
        { name: "Seogwipo", id: "1|0007|9013" }
    ];

    const dates = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`); // Lotte Cinema API 호출용 형식: YYYY-MM-DD
    }

    const lotteData = {};
    for (const branch of branches) {
        const allSchedulesForBranch = {};
        for (const date of dates) {
            console.log(`Fetching schedules for Lotte Cinema ${branch.name} on ${date}...`);
            const movieSchedules = await fetchLotteSchedule(branch.id, date);
            // crawlAll.js에서 사용할 YYYYMMDD 형식으로 날짜 키 변환
            const formattedDate = date.replace(/-/g, '');
            allSchedulesForBranch[formattedDate] = movieSchedules;
        }
        lotteData[branch.name] = allSchedulesForBranch;
    }
    return lotteData;
}

if (require.main === module) {
    crawlLotte().then(data => {
        console.log('Lotte Cinema crawling completed. Data:', JSON.stringify(data, null, 2));
    });
}

module.exports = crawlLotte;
