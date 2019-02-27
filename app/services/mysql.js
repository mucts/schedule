'use strict';

const _ = require('lodash');
const Model = require('../lib/mysql/model');

module.exports = {
    initialize({
                   modelSchemas,
                   pool,
                   readonlyPool,
                   expose,
               }) {
        readonlyPool = readonlyPool ? readonlyPool : pool;
        const modelClassesByGlobalId = {};
        const modelSchemasByGlobalId = _.keyBy(modelSchemas, (schema) => {
            return schema.globalId.toLowerCase();
        });
        for (const modelSchema of modelSchemas) {
            const model = new Model({
                modelSchema,
                modelSchemasByGlobalId,
                modelClassesByGlobalId,
                pool,
                readonlyPool,
            });

            modelClassesByGlobalId[modelSchema.globalId.toLowerCase()] = model;

            expose(model, modelSchema);
        }
    }
};
