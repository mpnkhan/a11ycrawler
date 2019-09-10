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

  let leftFrameContents ='<!DOCTYPE html><html><body><h2><a href="../report.html" target="_main"> Back </a> </h2><ol>';
  let indexFrameContents =`<!DOCTYPE html>
                          <html>
                          <frameset cols="20%,*">
                            <frame src="leftFrame.html">
                            <frame name="main" src="main.htm">
                          </frameset>
                          </html>
                          `;

  crawler.on('fetchcomplete', (queueItem, data, response) => {
    console.log("Fetched", queueItem.url);
    // var resume = crawler.wait();
    const ac = runLighthouse(queueItem.url);
    ac.then(results => {
      stats.auditTimesByPageUrl[queueItem.url].endTime = new Date();
      leftFrameContents+= results + "\n";
      // console.log(results);
       // resume();
    })
  })
  crawler.once('complete', () => {
    leftFrameContents+='</ol></body></html>';
    saveReport(indexFrameContents, leftFrameContents);
  })

//DEBUG Start
/** /
  var originalEmit = crawler.emit;
crawler.emit = function(evtName, queueItem) {
    crawler.queue.countItems({ fetched: true }, function(err, completeCount) {
        if (err) {
            throw err;
        }

        crawler.queue.getLength(function(err, length) {
            if (err) {
                throw err;
            }

            console.log("fetched %d of %d — %d open requests, %d open listeners",
                completeCount,
                length,
                crawler._openRequests.length,
                crawler._openListeners);
        });
    });

    console.log(evtName, queueItem ? queueItem.url ? queueItem.url : queueItem : null);
    originalEmit.apply(crawler, arguments);
};
/**/
//DEBUG End


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

        results2 =`<li><a target="main" href="${fArr[0]}.html">${url}</a></li>`
        results2 = results2 +'\n';
        stats.auditTimesByPageUrl[url] = {startTime: new Date()}
        lighthouse.once('close', () => {
          // resolve(results2);
        })
        resolve(results2);
     })
  }

  async function saveReport(indexFrameContents, leftFrameContents){
    console.log();
    console.log();
    console.log('Lighthouse Summary'.bold.underline);
    console.log();
    // console.log('stats', JSON.stringify(stats));
    console.log(`  Total Pages Scanned: ${stats.pageCount}`);

    const totalTime = Object.keys(stats.auditTimesByPageUrl).reduce((sum, url) => {
      const {endTime, startTime} = stats.auditTimesByPageUrl[url]
      return (endTime - startTime) + sum
    }, 0)

    console.log(`  Average Page Audit Time: ${Math.round(totalTime/stats.pageCount)} ms`);

    const leftFrameName = stats.scanId +'/leftFrame.html';
    const frameIndexName = stats.scanId +'/frameIndex.html';
    let  mainreport = `<tr><td><a href="${frameIndexName}">${stats.scanId}</a></td><td>${stats.mainURL}</td><td>${stats.pageCount}</td><td>${Math.round(totalTime/stats.pageCount)} ms</td><td>${stats.startTime.toLocaleString()}</tr>`
    mainreport = mainreport +'\n';

    await writeResult('reports/'+ frameIndexName, indexFrameContents);
    await writeResult('reports/'+ leftFrameName, leftFrameContents);
    await appendResult('reports/report.html', mainreport);
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
