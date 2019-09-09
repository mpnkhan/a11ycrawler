#!/usr/bin/env node

const yargs = require('yargs')
const a11ycrawler = require('.')

const options = yargs.demandOption([ 'u'])
  .alias('u', 'url').describe('url', 'URL to crawl')
  .alias('h', 'help').help('h')
  .argv

a11ycrawler(options)
