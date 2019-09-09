const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const flags = {
  onlyCategories: ['accessibility']
  , output: 'html'
  // , output-path:'reports/testing.html'
  
};


launchChromeAndRunLighthouse('https://example.com', flags).then(results => {
  console.log('results=>' , results)
});


function launchChromeAndRunLighthouse(url, opts, config = null) {
  return chromeLauncher.launch({chromeFlags: opts.chromeFlags}).then(chrome => {
    opts.port = chrome.port;
    return lighthouse(url, opts, config).then(results => {
      return chrome.kill().then(() => results.lhr)
    });
  });
}
