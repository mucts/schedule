'use strict';

const statusCode = KoaConfig.constant.forbidden;

module.exports = async function response(context, next) {
    context.forbidden = function forbidden(data) {
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
        message: "forbidden"
    };

    if (context.state.data) {
        context.body.message = context.state.data.message || context.state.data;
    }
};
