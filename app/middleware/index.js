'use strict';

const compose = require('koa-compose');
const compress = require('koa-compress');
const cors = require('kcors');
const helmet = require('koa-helmet');

const removeTrailingSlash = require('./removeTrailingSlash');
const requestLoggingDetails = require('./requestLoggingDetails');
const response = require('./response');
const routes = require('./routes');
const device = require('./device');
const policies = require('./policies');

module.exports = () => {
    return compose([
            helmet({
                frameguard: {
                    action: 'deny',
                },
                xssFilter: {
                    setOnOldIE: true,
                },
            }),
            cors(),
            device(),
            requestLoggingDetails(),
            response(),
            removeTrailingSlash(),
            compress(),
            policies(),
            routes()
        ]
    )
};
