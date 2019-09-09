  const cheerio = require('cheerio')
  const ChildProcess = require('child_process')
  const Crawler = require('simplecrawler')
  const path = require('path')
  const fs = require('fs')
  const colors = require('colors')

  const scanId =Math.floor((Math.random()*1000)+1)
  fs.mkdirSync('reports/'+ scanId.toString())

  const stats = {
    scanId: scanId,
    mainURL: null,
    pageCount: 0,
    startTime: null,
    auditTimesByPageUrl: {}
  }

module.exports = (options) => {
  stats.startTime = new Date()

  let crawler = new Crawler(options.url);
    crawler.respectRobotsTxt = false;
    crawler.parseHTMLComments = false;
    crawler.parseScriptTags = false;
    crawler.maxDepth = 2;
    crawler.maxChromeInstances =5;
  
    stats.mainURL = options.url;

  crawler.discoverResources = (buffer, item) => {
    const page = cheerio.load(buffer.toString('utf8'));
    const links = page('a[href]').map(function () {
      return page(this).attr('href');
    }).get()
    return links;
  }

  let indexreport=`<!doctype html>
                      <html lang="en">
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
                        <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAADjklEQVR4AWI08P/HQEvAQrxSQKvlECfLFYXx75xCY2qmh89GbNvOMjb3v9jOOlxnFWxj206ebQ3b7q6q+z1rNagu8/zvPSZACAABpeUAA0miMgU7SA7JjCraFGwZwECOwvL75dWjsKgWBKtx0jvWo+vkBAFbACCkByMP6nMn48+AVgXB2fzSCwsv22/lMGlUhmJ0AE7BH8dyUUDbUEgN6RzJRSeaPxhdRYR0Inel+7Hd5lBiFpkMAxACc0394//9C4voFHDiAAGLpuOXebdfdHfctgwJKaZRLRKy6ItrSis6RBnVBgGtbHyKTEmJHQoEXoBCE5BCrDeA2ogMUIGDAKEBDEhUqwgMqBYDjW4DQzmuffVdqff42/ZQYYqVcMXGZsMPyCsH3lyJSetxvEaxAQXdjR1HjfwCdIS7lo2DZke26Qe+MXO12OWkGT0O6oE7vMGkMnkYw4aN1KQgMKExhXqswfiov4+a7MQ11XPnbr/5qpKlgACAAQj94Lu271bN9DUecQasIZlNzG72llRAAKJiAi+/BSHrSFjRvQhg3DEKEqJh08tsmLTx597+f6enr4cc2Zpk57pihfX24dW7RHcOLLUbJYhJSl0ErQCI9BVXH/XrO97QasuvQQSiECa0BrQCIIJp6X9T/r8QG6L71WYSqCoIIGo2BZDUBnS/D9EA9Nun1iYvbM0MFExIDQRoKFatc1Z6zrm5uWeObJotq0BGV9FuQBWq5a4Fw3PPz848rZHstZSuA5FWAFSMP2nOppOOGpl6qh9PCSg0IFyHKjSQyDNQHTru2t75NOEe0fsf246oAmFkI6vCdnWvbQFQFCKx8vCswV8TrDLiDLgH4Nr7RAtNsrC9d8sfk7b8ls4igdNy8CQKAISlsB0FjZfd3Lfp155tf8fKI4BxZZIj/oTdVEAIAcJFOCmzauHG71I7/rdreUAgAqpDP05fDARCAQQARwEIBQSVxq0FyaLvZZtevpHa8WHw8cft6cpxlq8eAJtIhnSbWDf951yx3y13OqUuu5qyGgkxCgGFh9cDihDGbTa6BqvT1lWmrav3bmt2ZMJ4mU6TGgIC4DBzcv/JqAau1WhzSt3x9Ixk/4Jk/8J4ZrrViFMA4W6A7+WK8xcVjvyrOmVD0FbAXokcT48r+xVqLKvuJYbmpNadnlp3mpufJHOe/GXktM+r09bT8kEdq9BRYAbGSgzP7ll82U71Mc+ZFooXgwAAAABJRU5ErkJggg==">
                        <title>Index Report</title>
                      </head>
                      <body>
                     <table border="1" style="width: 70%; height: 100%; border:1px solid #8B008B">
                        <tr>
                          <th> Url</th>
                          <th> Link to Detailed Report</th>
   
                        `

  crawler.on('fetchcomplete', (queueItem, data, response) => {
    console.log(queueItem.url);
    // var resume = crawler.wait();
    const ac = runLighthouse(queueItem.url);
    ac.then(results => {
      stats.auditTimesByPageUrl[queueItem.url].endTime = new Date();
      indexreport+=results;
      // console.log(results);
       // resume();
    })
  })
  crawler.once('complete', () => {
    saveReport(indexreport);
  })

  crawler.start();

}  //end module.exports

  async function runLighthouse(url) {
        var result1 = await run(url);
        return result1;    
  }
  function run(url){
    var results2 =null;
     return new Promise((resolve, reject) => {
        stats.pageCount++
        const file = url.replace(/^.*[\\\/]/, '');
        const fArr =file.split('.');
        if(fArr[0].length===0) fArr[0]=Math.floor((Math.random()*100)+1);
        const filename = 'reports/' + stats.scanId + '/' + fArr[0] + '.html';
        // console.log(filename);

        const args = [
          url,
            '--output=html',
            `--output-path=${filename}`,
            '--disable-device-emulation',
            '--only-categories=accessibility',
            '--disable-cpu-throttling',
            '--disable-network-throttling',
            '--chrome-flags=--headless --disable-gpu'
        ]

        const lighthousePath = require.resolve('lighthouse/lighthouse-cli/index.js');
        const lighthouse = ChildProcess.spawn(lighthousePath, args);


        results2 =`<tr><td>${url}</td><td><a href="${fArr[0]}.html">${fArr[0]}.html</a></td></tr>`
        results2 = results2 +'\n';
        stats.auditTimesByPageUrl[url] = {startTime: new Date()}
        lighthouse.once('close', () => {
          // resolve(results2);
        })
        resolve(results2);
     })
  }

  async function saveReport(indexreport){
    console.log();
    console.log('Lighthouse Summary'.bold.underline);
    console.log('stats', JSON.stringify(stats));    
    console.log(`  Total Pages Scanned: ${stats.pageCount}`);

    const totalTime = Object.keys(stats.auditTimesByPageUrl).reduce((sum, url) => {
      const {endTime, startTime} = stats.auditTimesByPageUrl[url]
      return (endTime - startTime) + sum
    }, 0)

    console.log(`  Average Page Audit Time: ${Math.round(totalTime/stats.pageCount)} ms`);

    const indexFile = stats.scanId +'/index.html';
    let  mainreport = `<tr><td><a href="${indexFile}">${stats.scanId}</a></td><td>${stats.mainURL}</td><td>${stats.pageCount}</td><td>${Math.round(totalTime/stats.pageCount)} ms</td><td>${stats.startTime.toLocaleString()}</tr>`
    mainreport = mainreport +'\n';

    await appendResult('reports/report.html', mainreport);
    await writeResult('reports/'+ indexFile, indexreport);
  }

 function writeResult(fname, result){
   // console.log(result)
  return new Promise(function(resolve) {
    fs.writeFile(fname, result, function (err) {
      if (err) reject(err);
      resolve();
    });
  })
}

 function appendResult(fname, result){
   // console.log(result)
  return new Promise(function(resolve) {
    fs.appendFile(fname, result, function (err) {
      if (err) reject(err);
      resolve();
    });
  })
}
