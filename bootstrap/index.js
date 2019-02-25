'use strict';

const Koa = require('koa');
const config = require('../config');

global.KoaConfig = config;

const log = require("../app/services/log");
const middleware = require('../app/middleware');
const plugins = require('../app/plugins');

async function loadKoaApplication() {
    const app = new Koa();
    await plugins.startup(app);
    app.use(middleware());
    app.listen(config.config.port);
    log.info(`Listening on port ${config.config.port}`);
}

module.exports.load = loadKoaApplication;
