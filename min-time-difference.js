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


    // The inefficient way that works
    function runAnalysisBruteForce(timeListTokenized) {
        let minimum;

        for(let outerIndex = 0; outerIndex < timeListTokenized.length; outerIndex++) {
            const anchorTime = timeListTokenized[outerIndex];
            for(let innerIndex = 0; innerIndex < timeListTokenized.length; innerIndex++) {

                if(innerIndex === outerIndex) continue;

                const timeToCompare = timeListTokenized[innerIndex];
                const difference = timeDifference(anchorTime, timeToCompare);

                if(!minimum || difference < minimum.difference) {
                    minimum = { difference, outerIndex, innerIndex };
                }
            }
        }

        return minimum.difference;
    }

    function timeDifference(timeA, timeB) {
        const MINUTES_IN_HOUR = 60;
        const HOURS_IN_DAY = 23; // indexed by "00"
        let minutesDifference = Math.abs(parseInt(timeA[1]) - parseInt(timeB[1]));
        let hoursDifference = Math.abs(parseInt(timeA[0]) - parseInt(timeB[0]));

        if (Math.trunc(HOURS_IN_DAY/2) < hoursDifference) {
            hoursDifference = HOURS_IN_DAY - hoursDifference;
            minutesDifference = MINUTES_IN_HOUR - minutesDifference;
        }

        return (hoursDifference * MINUTES_IN_HOUR) + minutesDifference;
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