const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const pixels = require("image-pixels");
const resemble = require("resemblejs");
const gm = require("gm");

let page = null;
const bgImg = path.resolve(__dirname, "bg.png");
const bgBlurImg = path.resolve(__dirname, "bgBlur.png");
const bgDiffImg = path.resolve(__dirname, "bgDiff.png");
const proxyUrl = '127.0.0.1:9222';




async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox',],
  });
  page = await browser.newPage();

  page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36')

  await page.goto(
    "https://x.tongdun.cn/onlineExperience/slidingPuzzle?source=baidu&plan=%E5%8F%8D%E6%AC%BA%E8%AF%88&unit=%E6%99%BA%E8%83%BD%E9%AA%8C%E8%AF%81&keyword=%E6%99%BA%E8%83%BD%E9%AA%8C%E8%AF%81%E7%A0%81&e_creative=24659987438&e_adposition=cl1&e_keywordid=101045415224&e_keywordid2=101045415224&audience=236369"
  );

  //关键点1
  //JS1
  await page.evaluate(async () => {
    Object.defineProperty(navigator, 'webdriver', {get: () => false});
  });

  //JS2
  await page.evaluate(async ()=>{
    alert(window.navigator.webdriver)
  });

  //JS3
  await page.evaluate(async ()=>{
    window.navigator.chrome={
      runtime:{},
    }
  });

  //JS4
  await page.evaluate(async ()=>{
    Object.defineProperty(navigator,'languages', {get: ()=>['en-US','en']});
  });

  //JS5
  await page.evaluate(async ()=>{
    Object.defineProperty(navigator,'plugins', {get: ()=>[1,2,3,4,5,6]});
  });

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    return window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

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
}

run();

function getMoreNum(arr) {
  var obj = {};
  var arr1 = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr1.indexOf(arr[i]) == -1) {
      obj[arr[i]] = 1;
      arr1.push(arr[i]);
    } else {
      obj[arr[i]]++;
    }
  }
  var max = 0;
  var maxStr;
  for (var i in obj) {
    if (max < obj[i]) {
      max = obj[i];
      maxStr = i;
    }
  }
  return { max, maxStr };
}
