'use strict';

module.exports = () => {
    return async function removeTrailingSlash(context, next) {
        if (context.path.substr(-1) === '/' && context.path.length > 1) {
            context.redirect(`${context.path.slice(0, -1)}${context.search}`);
            context.status = 301;
        } else {
            await next();
        }
    };
};
