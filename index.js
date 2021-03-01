  const express = require('express')
  const app = express();
  const http = require('http');
  const cons = require('consolidate');
  const bodyParser = require('body-parser');

  // app.set('views', __dirname + '/reports');
  app.engine('html', cons.handlebars);
  // app.set('view engine', 'html');

  app.use(bodyParser.json({limit: '100mb'}));
  app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));


  const cheerio = require('cheerio');
  const ChildProcess = require('child_process');
  const Crawler = require('simplecrawler');
  const path = require('path');
  const fs = require('fs');
  const colors = require('colors');
  const http_port =  80;

  var server = http.createServer(app);
  app.listen(http_port);
  console.log('Express started on port ', http_port);

  app.use('/', express.static(__dirname + '/reports'));

  let stats = {
      scanId: null,
      mainURL: null,
      pageCount: 0,
      startTime: null,
      auditTimesByPageUrl: {}
    }

  app.post('/crawl', function(req, res) {

    let scanId =Math.floor((Math.random()*1000)+1);
    fs.mkdirSync('reports/'+ scanId.toString());
    stats.scanId = scanId;
    stats.startTime =new Date();

    const URL = req.body.textURL;
    let crawler = new Crawler(URL);
    crawler.respectRobotsTxt = false;
    crawler.parseHTMLComments = false;
    crawler.parseScriptTags = false;
    crawler.maxDepth = 2;
    crawler.maxChromeInstances =5;
  
    stats.mainURL = URL;

    crawler.discoverResources = (buffer, item) => {
      const page = cheerio.load(buffer.toString('utf8'));
      const links = page('a[href]').map(function () {
        return page(this).attr('href');
      }).get()
      return links;
    }

    let leftFrameContents ='<!DOCTYPE html><html><body><h2><a href="/" target="_main"> Back </a> </h2><ol>';
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
      res.redirect('/');
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

})  //end Crawl


  async function runLighthouse(url) {
        var result1 = await run(url);
        return result1;    
  }
  function run(url){
    var results2 =null;
     return new Promise((resolve, reject) => {
        stats.pageCount++
        // const file = url.replace(/^.*[\\\/]/, '');
        // const fArr =file.split('.');
        // if(fArr[0].length===0) fArr[0]=Math.floor((Math.random()*100)+1);
        let file = Math.floor((Math.random()*1000)+1);
        let filename = 'reports/' + stats.scanId + '/' + file + '.html';
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

        results2 =`<li><a target="main" href="${file}.html">${url}</a></li>`
        results2 = '\n' + results2;
        stats.auditTimesByPageUrl[url] = {startTime: new Date()}
        lighthouse.once('close', () => {
          console.log(  `file ${url} =>  , ${filename}`)
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
    mainreport = '\n' + mainreport;

    await writeResult('reports/'+ frameIndexName, indexFrameContents);
    await writeResult('reports/'+ leftFrameName, leftFrameContents);
    await appendResult('reports/index.html', mainreport);
  }

 function writeResult(fname, result){
   // console.log(result)
  return new Promise(function(resolve, reject) {
    fs.writeFile(fname, result, function (err) {
      if (err) reject(err);
      resolve();
    });
  })
}

 function appendResult(fname, result){
   // console.log(result)
  return new Promise(function(resolve, reject) {
    fs.appendFile(fname, result, function (err) {
      if (err) reject(err);
      resolve();
    });
  })
}
