'use strict';

const path = require('path');

const log = require('./log');
const routes = require('./routes');
const database = require("./database");
const config = require("./config");
const constant = require("./constant");
const policies = require("./policies");

module.exports = {
    path: path.join(__dirname, '..'),
    log,
    routes,
    constant,
    policies,
    database,
    config
};
