'use strict';

const app = require('./bootstrap');
const log = require('./app/services/log');

app.load().catch((ex) => {
    log.error(ex);
    throw ex;
});
