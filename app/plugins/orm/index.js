'use strict';

const _ = require('lodash');
const fs = require('mz/fs');
const path = require('path');
const mysql = require('mysql');
const big = require('../../services/mysql');
const log = require('../../services/log');

module.exports = {
    startup: async function ormStartup(app) {
        const modelsPath = path.join(__dirname, '../../models');
        try {
            if (KoaConfig.database) {
                log.info("Setup orm...");
                app.orm = app.orm || {};
                for (let db in KoaConfig.database) {
                    const pool = new mysql.createPool(KoaConfig.database[db]);
                    const readonlyPool = null;
                    const modelsPath = path.join(__dirname, '../../models/' + db);
                    const files = await fs.readdir(modelsPath);
                    const modelSchemas = files.filter((file) => /.js$/ig.test(file)).map((file) => {
                        const fileBasename = path.basename(file, '.js');
                        const schema = require(`${modelsPath}/${fileBasename}`);
                        return _.merge({
                            globalId: fileBasename,
                            tableName: fileBasename.toLowerCase(),
                        }, schema);
                    });
                    app.orm[db] = app.orm[db] || {};
                    await big.initialize({
                        modelSchemas,
                        pool,
                        readonlyPool,
                        expose: (model, modelSchema) => {
                            app.orm[db][modelSchema.globalId] = model;
                        },
                    });
                }
                log.info('Done!');
            } else {
                log.info('Skipping orm config. No database defined.');
            }
        } catch (ex) {
            log.warn(`No waterline models detected in ${modelsPath}`);
        }
    }
};
