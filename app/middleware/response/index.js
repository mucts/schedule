'use strict';

const compose = require('koa-compose');
const serverError = require('./500');
const negotiate = require('./negotiate');
const badRequest = require('./400');
const noPermission = require('./403');
const notFound = require('./404');

module.exports = () => {
    return compose([
        serverError,
        negotiate,
        badRequest,
        noPermission,
        notFound,
    ]);
};
