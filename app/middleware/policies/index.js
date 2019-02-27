'use strict';

const _ = require('lodash');
const Router = require('koa-router');
const index = require('../../policies');
const log = require('../../services/log');

module.exports = () => {
    const router = new Router();

    for (const routeKey of _.keys(KoaConfig.policies)) {
        const [verb, url] = routeKey.split(' ');
        for (const routePolicyName of KoaConfig.policies[routeKey]) {
            const policy = index[routePolicyName];

            if (policy) {
                if (url[0] === '^') {
                    const urlRegex = new RegExp(url);
                    router[verb](urlRegex, policy);
                } else {
                    router[verb](url, policy);
                }
            } else {
                log.warn(`Unable to find ${routePolicyName} policy for route: ${routeKey}`);
            }
        }
    }

    return router.routes();
};
