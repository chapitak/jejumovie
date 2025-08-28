const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // axios import를 파일 상단으로 이동

// x-signature와 x-timestamp를 한 번만 추출하는 함수
async function getAuthHeaders() {
    console.time('getAuthHeaders execution');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = `https://cgv.co.kr/cnm/movieBook/cinema`;

    let capturedXSignature = '';
    let capturedXTimestamp = '';
    let capturedReferer = '';
    let capturedCookie = '';

    try {
        const requestPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('requestPromise timed out after 10 seconds'));
            }, 10000); // 10초 타임아웃

            page.on('request', request => {
                if (request.url().includes('api-mobile.cgv.co.kr/cnm/atkt/searchMovScnInfo')) {
                    capturedXSignature = request.headers()['x-signature'];
                    capturedXTimestamp = request.headers()['x-timestamp'];
                    capturedReferer = request.headers()['referer']; // Capture referer
                    if (capturedXSignature && capturedXTimestamp && capturedReferer) {
                        clearTimeout(timeoutId);
                        resolve();
                    }
                }
            });
        });

        console.time('page.goto');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 }); // page.goto 타임아웃 10초
        console.timeEnd('page.goto');

        // Capture cookies after page navigation
        const cookies = await page.cookies();
        capturedCookie = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        console.time('waitForSelector and click region');
        const regionSelector = 'body > div:nth-child(1) > div > div > div > div > div.mets01390_mainContentArea__GkUrT > div > div.cgv-modal.cgv-bot-modal.active > section > div.modal-content.btn-border > div.bottom_theaterList__zuOJA.bottom_region__2bZCS > ul > li:nth-child(9) > button';
        await page.waitForSelector(regionSelector, { timeout: 5000 }); // 셀렉터 대기 타임아웃 5초
        await page.click(regionSelector);
        console.timeEnd('waitForSelector and click region');

        console.time('waitForSelector and click Jeju branch');
        const jejuBranchSelector = 'body > div:nth-child(1) > div > div > div > div > div.mets01390_mainContentArea__GkUrT > div > div.cgv-modal.cgv-bot-modal.active > section > div.modal-content.btn-border > div.bottom_theaterList__zuOJA.bottom_region__2bZCS > div > div > div.bottom_listCon__8g46z > ul > li:nth-child(21) > button > p';
        await page.waitForSelector(jejuBranchSelector, { timeout: 5000 }); // 셀렉터 대기 타임아웃 5초
        await page.click(jejuBranchSelector);
        console.timeEnd('waitForSelector and click Jeju branch');

        console.time('requestPromise wait');
        await requestPromise; // x-signature와 x-timestamp가 캡처될 때까지 기다립니다.
        console.timeEnd('requestPromise wait');

        if (!capturedXSignature || !capturedXTimestamp || !capturedReferer || !capturedCookie) {
            console.error('Failed to obtain all required headers (x-signature, x-timestamp, referer, cookie) from API request or page.');
            return null;
        }

        return { xSignature: capturedXSignature, xTimestamp: capturedXTimestamp, cookie: capturedCookie, referer: capturedReferer };
    } catch (error) {
        console.error(`Error getting auth headers:`, error.message);
        return null;
    } finally {
        await browser.close();
        console.timeEnd('getAuthHeaders execution');
    }
}

// 직접 API를 호출하여 스케줄을 가져오는 함수
async function fetchCgvSchedule(siteNo, scnYmd, xSignature, xTimestamp, cookie, referer) {
    let movieSchedules = [];

    try {
        const apiUrl = 'https://api-mobile.cgv.co.kr/cnm/atkt/searchMovScnInfo';
        const headers = {
            'x-signature': xSignature,
            'x-timestamp': xTimestamp,
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'ko-KR',
            'cookie': cookie, // Add cookie header
            'origin': 'https://cgv.co.kr',
            'referer': referer, // Add referer header
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Linux"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        };
        const params = { // Change to params for GET request
            'coCd': 'A420',
            'siteNo': siteNo,
            'scnYmd': scnYmd,
            'rtctlScopCd': '08'
        };

        const response = await axios.get(apiUrl, { headers: headers, params: params }); // Change to axios.get
        const data = response.data;

        if (data && Array.isArray(data.data)) { // data.data가 배열인지 확인
            data.data.forEach(schedule => { // data.data 배열을 직접 순회 (각 요소가 스케줄 객체)
                movieSchedules.push({
                    movNm: schedule.expoProdNm, // 영화 이름
                    movieRating: schedule.cratgClsNm, // 관람 등급
                    hallName: schedule.scnsNm, // 상영관 이름
                    scnStartTm: schedule.scnsrtTm, // 상영 시작 시간
                    remSeatCnt: schedule.frSeatCnt, // 잔여 좌석 수
                    scnTypeNm: schedule.movkndDsplNm // 상영 타입 (2D, 3D 등)
                });
            });
        }

        return movieSchedules;
    } catch (error) {
        console.error(`Error fetching CGV schedule for site ${siteNo} on ${scnYmd}:`, error.message);
        return [];
    }
}

async function crawlCgv() {
    const branches = [
        { name: "제주", code: "0259" },
        { name: "제주노형", code: "0302" }
    ];

    const dates = [];
    const today = new Date(); // Use the current date as the starting point
    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}${month}${day}`);
    }

    // x-signature와 x-timestamp를 한 번만 얻습니다.
    console.log('Getting authentication headers...');
    const authHeaders = await getAuthHeaders();

    if (!authHeaders) {
        console.error('Failed to get authentication headers. Exiting.');
        return;
    }
    const { xSignature, xTimestamp, cookie, referer } = authHeaders; // Destructure cookie and referer
    console.log('Authentication headers obtained.');

    for (const branch of branches) {
        const allSchedulesForBranch = {};
        for (const date of dates) {
            console.log(`Fetching schedules for CGV ${branch.name} on ${date}...`);
            // fetchCgvSchedule에 xSignature, xTimestamp, cookie, referer 전달
            const movieSchedules = await fetchCgvSchedule(branch.code, date, xSignature, xTimestamp, cookie, referer);
            allSchedulesForBranch[date] = movieSchedules;
        }
        const filePath = path.join(__dirname, 'data', `cgv_${branch.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(allSchedulesForBranch, null, 2), 'utf8');
        console.log(`CGV ${branch.name} data saved to ${filePath}`);
    }
}

if (require.main === module) {
    crawlCgv();
}

module.exports = crawlCgv;