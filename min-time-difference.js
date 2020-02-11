#!/usr/bin/env node

(async () => {
    await exec();
    return;

    async function exec() {
        const timesList = JSON.parse(await getInput());

        if(timesList.length < 2) {
            // should never hit here based on write-up
            console.log(`Not enough input, exiting`);
            return;
        }

        const timeListTokenized = tokenize(timesList);
        const minMinutes = runAnalysisBruteForce(timeListTokenized);

        console.log(`Output: ${minMinutes}`);
        return minMinutes;
    }

    function tokenize(timeList) {
        return timeList.map(validTime => validTime.split(`:`));
    }

    function getInput() {
        return new Promise((resolve, reject) => {
            const stdin = process.stdin;
            let data = ``;

            stdin.setEncoding(`utf8`);

            stdin.on(`data`, function (chunk) {
                data += chunk;
            });

            stdin.on(`end`, function () {
                resolve(data);
            });

            stdin.on(`error`, reject);
        });
    }
})();