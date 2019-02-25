'use strict';

const bowser = require('bowser');

module.exports = () => {
  return async function modernBrowser(context, next) {
    if (bowser.isUnsupportedBrowser({ msie: "11" }, context.request.headers['user-agent'])) {
      context.redirect('/browse-happy');
    }

    await next();
  };
};
