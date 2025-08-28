const fs = require('fs');
const path = require('path');
const crawlMegabox = require('./crawlMegabox');

async function testMegaboxCrawl() {
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

    console.log("Starting Megabox multi-branch and multi-day crawl test...");

    // Clean up previous test run data if any
    for (const branch of branches) {
        const filePath = path.join(__dirname, 'data', `megabox_${branch.name}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up existing file: ${filePath}`);
        }
    }

    try {
        await crawlMegabox();

        for (const branch of branches) {
            const filePath = path.join(__dirname, 'data', `megabox_${branch.name}.json`);
            if (fs.existsSync(filePath)) {
                console.log(`Test Passed: megabox_${branch.name}.json file was created.`);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const jsonData = JSON.parse(fileContent);

                if (typeof jsonData === 'object' && Object.keys(jsonData).length > 0) {
                    console.log(`Test Passed: megabox_${branch.name}.json contains valid object data.`);

                    for (const date of dates) {
                        if (jsonData[date] && Array.isArray(jsonData[date])) {
                            console.log(`Test Passed: ${branch.name} on ${date} has an array of schedules.`);
                            // It's possible for a day to have no movies, so we don't strictly check for length > 0 here
                            // if (jsonData[date].length > 0) {
                            //     console.log(`Test Passed: ${branch.name} on ${date} has non-empty movie schedules.`);
                            // } else {
                            //     console.warn(`Warning: ${branch.name} on ${date} has empty movie schedules.`);
                            // }
                        } else {
                            console.error(`Test Failed: ${branch.name} on ${date} is missing or not an array.`);
                            process.exit(1);
                        }
                    }
                } else {
                    console.error(`Test Failed: megabox_${branch.name}.json is empty or invalid object.`);
                    process.exit(1);
                }
            } else {
                console.error(`Test Failed: megabox_${branch.name}.json file was not created.`);
                process.exit(1);
            }
        }
    } catch (error) {
        console.error("Test Failed during crawl execution:", error.message);
        process.exit(1);
    }
    console.log("Megabox multi-branch and multi-day crawl test completed.");
}

testMegaboxCrawl();