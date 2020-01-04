const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const pixels = require("image-pixels");
const resemble = require("resemblejs");
const gm = require("gm");

//引入包
const express = require('express');
const bodyParser = require('body-parser');
const assert = require('assert');
const request = require("request-promise");


let page = null;
const bgImg = path.resolve(__dirname, "bg.png");
const bgBlurImg = path.resolve(__dirname, "bgBlur.png");
const bgDiffImg = path.resolve(__dirname, "bgDiff.png");




 
const app = express();
 
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
 
const port = process.env.PORT || 8080; // set HTTP server port
 
//=====图形验证相关start=====
 
async function getResourceContent(page, url) {
    const {content, base64Encoded} = await page._client.send(
        'Page.getResourceContent',
        {frameId: String(page.mainFrame()._id), url},
    );
    assert.equal(base64Encoded, true);
    return content;
};
 
//请求校验验证码
function post(options) {
    return new Promise((resolve, reject) => {
        request.post(options, function (err, response, body) {
            // console.log('返回结果：');
            if (!err && response.statusCode == 200) {
                if (body !== 'null') {
                    results = body;
                    resolve(results);
                }
            }
        });
    }).catch(new Function()).then();
}
 
//=====图形验证相关end=======
// REQUEST FOR OUR API
// =============================================================================
const router = express.Router(); // get an instance of the express Router
router.route('/login').get((req, res) => {
    (async () => {
 
        // 代理隧道验证信息
        const proxyUrl = 'http://localhost:9222';
        const username = '123123123';
        const password = '123123123';
        const browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            executablePath:"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${proxyUrl}`],
        });
 
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        try {
            await page.authenticate({username, password});
            //Alipay
            await page.goto(
              "https://x.tongdun.cn/onlineExperience/slidingPuzzle?source=baidu&plan=%E5%8F%8D%E6%AC%BA%E8%AF%88&unit=%E6%99%BA%E8%83%BD%E9%AA%8C%E8%AF%81&keyword=%E6%99%BA%E8%83%BD%E9%AA%8C%E8%AF%81%E7%A0%81&e_creative=24659987438&e_adposition=cl1&e_keywordid=101045415224&e_keywordid2=101045415224&audience=236369"
            );
            await page.waitForSelector("#loginBtn");
          
            await page.click("#loginBtn");
            const slidetrigger = ".td-pop-slidetrigger";
            await page.waitForSelector(slidetrigger);
          
            await page.click(slidetrigger);
            await page.waitFor(1000);
            const slideIdentity = ".td-pop-slide-identity";
            await page.waitFor(slideIdentity);
          
            // 获取小滑块的top值，来减少比对范围
            const top = await page.evaluate(() => {
              const identity = document.querySelector(".td-pop-slide-identity");
              return identity.offsetTop;
            });
          
            async function getDistance() {
              // 获取缺口图片
              let { bg } = await page.evaluate(() => {
                const bg = document.querySelector(".td-bg-img");
                return {
                  bg: bg.toDataURL()
                };
              });
              bg = bg.replace(/^data:image\/\w+;base64,/, "");
              var bgDataBuffer = new Buffer.from(bg, "base64");
          
              fs.writeFileSync(bgImg, bgDataBuffer);
          
              // 图片模糊
              gm(bgImg)
                .blur(1)
                .write(bgBlurImg, function(err) {
                  if (!err) console.log("done");
                });
          
              // 图片对比
              resemble(bgImg)
                .compareTo(bgBlurImg)
                .ignoreColors()
                .onComplete(async function(data) {
                  fs.writeFileSync(bgDiffImg, data.getBuffer());
                });
          
              var { data } = await pixels(bgDiffImg, {
                cache: false
              });
              let arr = [];
          
              // 比对范围内的像素点
              for (let i = top; i < top + 44; i++) {
                for (let j = 60; j < 320; j++) {
                  var p = 320 * i + j;
                  p = p << 2;
                  if (data[p] === 255 && data[p + 1] === 0 && data[p + 2] === 255) {
                    arr.push(j);
                    break;
                  }
                }
              }
              const { maxStr } = getMoreNum(arr);
              return Number(maxStr);
            }
          
            const distance = await getDistance();
            const button = await page.$(slidetrigger);
            const box = await button.boundingBox();
            const axleX = Math.floor(box.x + box.width / 2);
            const axleY = Math.floor(box.y + box.height / 2);
            console.log(distance, "distance");
            console.log(box.x + distance);
          
            await btnSlider(distance);
            async function btnSlider(distance) {
              await page.mouse.move(axleX, axleY);
              await page.mouse.down();
              await page.waitFor(200);
              await page.mouse.move(box.x + distance / 4, axleY, { steps: 20 });
              await page.waitFor(200);
              await page.mouse.move(box.x + distance / 3, axleY, { steps: 18 });
              await page.waitFor(350);
              await page.mouse.move(box.x + distance / 2, axleY, { steps: 15 });
              await page.waitFor(400);
              await page.mouse.move(box.x + (distance / 3) * 2, axleY, { steps: 15 });
              await page.waitFor(350);
              await page.mouse.move(box.x + (distance / 4) * 3, axleY, { steps: 10 });
              await page.waitFor(350);
              await page.mouse.move(box.x + distance + 20, axleY, { steps: 10 });
              await page.waitFor(300);
              await page.mouse.up();
              await page.waitFor(1000);
            }
        } catch (e) {
            await page.deleteCookie();
            await browser.close();
            res.send({
                message: "请求异常,请检查",
                document: "请求异常,无内容"
            });
            console.log(e);
        }
 
    })();
    // res.json({message: 'hi, Not yet!!'});
});
 

 
function delay(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}
 
// test route to make sure everything is working (accessed at GET
// http://localhost:8080/api)  http://localhost:8080/api/login?mobile=13888888888
router.get('/', (req, res) => {
    console.log("hi, welcome to  http服务!");
    res.json({message: 'hi, welcome to  http服务!'});
});
 
// more roues for our API will happen here
 
// REGISTER OUR ROUTES ---------------------------------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);
 
// START THE SERVER
// =============================================================================
app.listen(port);
console.log(`Magic happens on port ${port}`);
