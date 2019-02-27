'use strict';

const orm = require('./orm');

module.exports = {
    startup: (app) => {
        return Promise.all([
            orm.startup(app)
        ]);
    },
};
