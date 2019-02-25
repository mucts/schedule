'use strict';

const winston = require('winston');
const util = require('util');
const _ = require('lodash');

const log = {
    info(...args) {
        log._log('info', ...args);
    },

    warn(...args) {
        log._log('warn', ...args);
    },

    error(...args) {
        log._log('error', ...args);
    },

    _log(level, ...args) {
        const pieces = [];
        let meta = null;
        _.each(args, (arg) => {
            if (typeof arg === 'object' && arg instanceof Error && arg.stack && !arg.inspect) {
                pieces.push(arg.stack);
            } else if (typeof arg === 'object') {
                if (typeof arg.url === 'undefined') {
                    pieces.push(util.inspect(arg));
                } else {
                    meta = arg;
                }
            } else {
                pieces.push(arg);
            }
        });
        if (!pieces.length) {
            const unknownError = new Error("Unknown error");
            pieces.push(unknownError.stack);
        }

        const logString = util.format(...pieces);
        this.logger.log(level, logString, meta);
    },
    logger: winston.createLogger({
        level: 'info',
        exitOnError: false,
        transports: [
            new winston.transports.Console({
                prettyPrint: true,
                colorize: true,
            }),
        ],
    }),
};

module.exports = log;
