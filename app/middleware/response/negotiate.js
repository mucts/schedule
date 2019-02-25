'use strict';

module.exports = async function response(context, next) {
  context.negotiate = function negotiate(error) {
    context.status = error.status || KoaConfig.constant.serverError;
    context.state.data = error;
  };

  await next();
};
