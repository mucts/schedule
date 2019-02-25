'use strict';

const bodyParser = require('koa-bodyparser');
const helmet = require('koa-helmet');
const modernBrowser = require('./modernBrowser');

module.exports = {
  bodyParser: bodyParser(),
  noCache: helmet.noCache(),
  modernBrowser: modernBrowser(),
};
