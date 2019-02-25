'use strict';

const statusCode = KoaConfig.constant.badRequest;

module.exports = async function response(context, next) {
    context.badRequest = function badRequest(data) {
        context.status = statusCode;
        context.state.data = data;
    };

    await next();

    if (context.status !== statusCode) {
        return;
    }
    context.status = statusCode;
    if(!context.body) {
        context.body = {
            code: statusCode,
            message: "bad request"
        };

        if (context.state.data) {
            context.body.message = context.state.data.message || context.state.data;
        }
    }
};
