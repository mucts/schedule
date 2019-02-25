'use strict';

const statusCode = KoaConfig.constant.serverError;
const log = require('../../services/log');

module.exports = async function response(context, next) {
  context.serverError = function serverError(data) {
    context.status = statusCode;
    context.state.data = data;
  };

  try {
    await next();
  } catch (ex) {
    context.state.data = ex;
    context.status = statusCode;
  }

  if (context.status !== statusCode) {
    return;
  }

  let logData = context.state.data;
  if (!(logData instanceof Error)) {
    logData = new Error(logData || `Error ${context.status}`);
  }

  log.error(logData);

  if (context.state.data instanceof Error) {
    context.body = {
      code: statusCode,
      message: context.state.data.message,
    };
  } else {
    context.body = {
      code: statusCode,
      message: "internal server error",
    };
  }

  context.status = statusCode;
};
