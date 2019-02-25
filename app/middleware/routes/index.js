'use strict';

const _ = require('lodash');
const Router = require('koa-router');
const log = require('../../services/log');

module.exports = () => {
    const router = new Router();
    const isGetRegExp = new RegExp(/get/i);

    KoaConfig.routeDetails = {};
    for (const routeKey of _.keys(KoaConfig.routes)) {
        const [verb, url] = routeKey.split(' ');
        const routeValue = KoaConfig.routes[routeKey];
        if (routeValue[0] === '/') {
            router.redirect(url, routeValue, 301);
        } else {
            const [controllerPath, action] = routeValue.split('.');
            const cp = controllerPath.replace(/\\/ig,"/");

            const controller = require(`../../controllers/${cp}`);
            if (controller) {
                const actionInstance = controller[action];
                if (actionInstance) {
                    router[verb](url, actionInstance);

                    // Trim "Controller" off the end of the controllerPath
                    if (!KoaConfig.routeDetails[url] || isGetRegExp.test(verb)) {
                        KoaConfig.routeDetails[url] = {
                            controller: controllerPath.replace(/Controller$/ig, '').toLowerCase(),
                            action,
                        };
                    }
                } else {
                    log.warn(`Unable to find controller action for route: ${routeKey}`);
                }
            } else {
                log.warn(`Unable to find controller for route: ${routeKey}`);
            }
        }
    }

    return router.routes();
};
