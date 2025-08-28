const fs = require('fs');
const path = require('path');
const crawlCgv = require('./crawlCgv');
const crawlLotte = require('./crawlLotte');

async function crawlAll() {
    console.log('Starting all crawlers...');
    const finalMovieData = {}; // 최종 데이터를 저장할 객체

    // 영어 지점 이름을 한글로 매핑
    const branchNameMap = {
        "Jeju": "제주",
        "JejuNohyeong": "제주노형",
        "JejuYeonDong": "제주연동",
        "Seogwipo": "서귀포",
        "Samhwa": "삼화",
        "Ara": "아라"
    };

    // 영화관 브랜드 이름을 한글로 매핑
    const theaterNameMap = {
        "CGV": "CGV",
        "Lotte Cinema": "롯데시네마",
        "Megabox": "메가박스"
    };

    // 데이터를 재구성하는 헬퍼 함수
    const reorganizeData = (theaterNameEn, branchNameEn, schedules) => {
        const theaterNameKr = theaterNameMap[theaterNameEn] || theaterNameEn;
        const branchNameKr = branchNameMap[branchNameEn] || branchNameEn;

        for (const date in schedules) {
            schedules[date].forEach(schedule => {
                const movieName = schedule.movNm;
                if (!finalMovieData[movieName]) {
                    finalMovieData[movieName] = []; // 배열로 초기화
                }
                const newEntry = {
                    branch: branchNameKr, // 한글 지점 이름 사용
                    theater: theaterNameKr, // 한글 영화관 브랜드 이름 사용
                    date: date // 날짜 정보 추가
                };
                // 중복 확인: 이미 동일한 branch, theater, date를 가진 항목이 있는지 확인
                const isDuplicate = finalMovieData[movieName].some(
                    existingEntry =>
                        existingEntry.branch === newEntry.branch &&
                        existingEntry.theater === newEntry.theater &&
                        existingEntry.date === newEntry.date
                );

                if (!isDuplicate) {
                    finalMovieData[movieName].push(newEntry);
                }
            });
        }
    };

    // CGV 크롤링
    try {
        const cgvData = await crawlCgv();
        for (const branchName in cgvData) {
            reorganizeData('CGV', branchName, cgvData[branchName]);
        }
        console.log('CGV crawling data collected and reorganized.');
    } catch (error) {
        console.error('Error during CGV crawling:', error.message);
    }

    // Lotte Cinema 크롤링
    try {
        const lotteData = await crawlLotte();
        for (const branchName in lotteData) {
            reorganizeData('Lotte Cinema', branchName, lotteData[branchName]);
        }
        console.log('Lotte Cinema crawling data collected and reorganized.');
    } catch (error) {
        console.error('Error during Lotte Cinema crawling:', error.message);
    }

    // Megabox 크롤링
    try {
        const megaboxData = await require('./crawlMegabox')();
        for (const branchName in megaboxData) {
            reorganizeData('Megabox', branchName, megaboxData[branchName]);
        }
        console.log('Megabox crawling data collected and reorganized.');
    } catch (error) {
        console.error('Error during Megabox crawling:', error.message);
    }

    // TODO: 한림작은영화관 크롤러 추가

    const filePath = path.join(__dirname, 'data', 'movies.json');
    fs.writeFileSync(filePath, JSON.stringify(finalMovieData, null, 2), 'utf8');
    console.log(`All movie data saved to ${filePath}`);
}

if (require.main === module) {
    crawlAll();
}

module.exports = crawlAll;