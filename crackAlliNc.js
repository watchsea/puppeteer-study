var puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors');
const fetch = require('node-fetch');
const iphone = devices['iPhone 6'];
const conf = {
    headless: false,
    defaultViewport: null,
    slowMo: 30
};


(async () => {
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
        browserWSEndpoint: wsChromeEndpointUrl,
        defaultViewport:null                       //set the viewport maxium
    });

    let pageUrl = 'https://passport.zcool.com.cn/regPhone.do?appId=1006&cback=https://my.zcool.com.cn/focus/activity';
    
    var page = await browser.newPage();
    await page.goto(pageUrl, {
        waitUntil: 'networkidle0' // 'networkidle0' is very useful for SPAs.
    });


// puppeteer.launch(conf).then(async browser => {
//     var page = await browser.newPage()
//     //await page.emulate(iphone) 
//     await page.goto(pageUrl)
    //关键点1
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false})
    })
    // 错误输入，触发验证码
    // await page.type('#mobileReal', '176112628161')
    // await page.click('#dingapp > div > div > div > div > div._38BOT4Nk > a')
    // await page.type('#mobileReal', '')
    // await page.keyboard.press('Backspace')
    // await page.click('._2q5FIy80')
    // 等待滑块出现
    var slide_btn = await page.waitForSelector('#nc_1_n1t', {timeout: 30000})
    // 计算滑块距离
    const rect = await page.evaluate((slide_btn) => {
        const {top, left, bottom, right} = slide_btn.getBoundingClientRect();
        return {top, left, bottom, right}
    }, slide_btn)
    console.log(rect)
    rect.left = rect.left + 10
    rect.top = rect.top + 10
    const mouse = page.mouse
    await mouse.move(rect.left, rect.top)
    // 关键点2
    await page.touchscreen.tap(rect.left, rect.top) // h5需要手动分发事件 模拟app的事件分发机制。
    await mouse.down()
    var start_time = new Date().getTime()
    await mouse.move(rect.left + 800, rect.top, {steps: 25})
    await page.touchscreen.tap(rect.left + 800, rect.top,)
    console.log(new Date().getTime() - start_time)
    await mouse.up()
    console.log(await page.evaluate('navigator.webdriver'))
    console.log('end')
    // await page.close()

})();
//原文链接：https://blog.csdn.net/u013356254/article/details/88564342