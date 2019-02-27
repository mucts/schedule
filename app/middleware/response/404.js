'use strict';

const statusCode = KoaConfig.constant.notFound;

module.exports = async function response(context, next) {
    context.notFound = function notFound(data) {
        context.status = statusCode;
        context.state.data = data;
    };

    await next();

    if (context.status !== statusCode) {
        return;
    }

    context.status = statusCode;
    context.body = {
        code: statusCode,
        //url: context.originalUrl,
        message:"not found"
    };

    if (context.state.data) {
        context.body.message = context.state.data.message || context.state.data;
    }
};
