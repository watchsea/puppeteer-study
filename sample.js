const puppeteer = require('puppeteer');
const fetch = require('node-fetch')
let fs = require('fs');

(async () => {
    // OPTION 1 - Launch new.
    // const browser = await puppeteer.launch({
    //     headless: false // Puppeteer is 'headless' by default.
    // });

    let wsChromeEndpointUrl = '';
    await fetch("http://127.0.0.1:9222/json/version")
    .then(response => response.json())
    .then(function(data) {
        console.log(data)
        //let filteredData = data.filter(tab => tab.type ==='page');
        wsChromeEndpointUrl = data.webSocketDebuggerUrl;
      })
    .catch(error => console.log(error));
    
    // OPTION 2 - Connect to existing.
    // MAC: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')
    // PC: start chrome.exe –remote-debugging-port=9222
    // Note: this url changes each time the command is run.

    //const wsChromeEndpointUrl = 'ws://localhost:9222/devtools/browser/d9f61044-4a22-4ff2-a32f-ea1070f7dcb4';

    const browser = await puppeteer.connect({
        browserWSEndpoint: wsChromeEndpointUrl
    });

    const page = await browser.newPage();
    let pageUrl = 'https://www.google.com/';

    await page.goto(pageUrl, {
        waitUntil: 'networkidle0' // 'networkidle0' is very useful for SPAs.
    });

    let mostSearchedList = await page.evaluate(() => {
        let objectList = document.querySelectorAll('.js-most-searched .home__list-item');
        let mostSearched = [];

        objectList.forEach((item) => {
            let child = item.firstChild;
            let title = child.innerText;
            let href = child.href;

            mostSearched.push(title + ' - ' + href);
        });

        return mostSearched;
    });

    fs.writeFile("mostSearched.txt", mostSearchedList, function(err) {
        if(err) {
            return console.log(err);
        }
    
        console.log("The file was saved!");
    });     
})();