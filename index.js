  const cheerio = require('cheerio')
  const ChildProcess = require('child_process')
  const Crawler = require('simplecrawler')
  const path = require('path')
  const fs = require('fs')
  const queue = require('async/queue')
  const colors = require('colors')

  // var initialURL = "https://atom.io/"
  var initialURL = "https://paypal.com/"

  const crawler = new Crawler(initialURL)
  crawler.respectRobotsTxt = false
  crawler.parseHTMLComments = false
  crawler.parseScriptTags = false
  crawler.maxDepth = 2
  crawler.maxChromeInstances =5


  crawler.discoverResources = (buffer, item) => {
    const page = cheerio.load(buffer.toString('utf8'))
    const links = page('a[href]').map(function () {
      return page(this).attr('href')
    }).get()
    return links
  }

  const lighthouseQueue = queue((url, callback) => {
/*    
    runLighthouse(url, configPath, (errorCount) => {
      totalErrorCount += errorCount
      callback()
    })
*/    
  }, crawler.maxChromeInstances)

  crawler.on('fetchcomplete', (queueItem, responseBuffer, response) => {
     console.log(queueItem.url)
    lighthouseQueue.push(queueItem.url)
  })
  crawler.once('complete', () => {
    lighthouseQueue.drain = () => {
    }
  })

  crawler.start()