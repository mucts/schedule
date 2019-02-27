'use strict';

module.exports = {
    info: KoaConfig.log.info,
    warn: KoaConfig.log.warn,
    error(...args) {
        KoaConfig.log.error(...args);
    },
};