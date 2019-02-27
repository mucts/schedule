'use strict';

const _ = require('lodash');
const helper = require('./helper');
const log = require("../../services/log");

module.exports = class Model {
    /**
     * Creates a new Model object
     * @param {Object} modelSchema - Model definition
     * @param {Object} modelSchemasByGlobalId - All model schemas organized by global id
     * @param {Object} modelClassesByGlobalId - All model classes organized by global id
     * @param {Object} pool - Postgres Pool
     * @param {Object} [readonlyPool] - Postgres Pool for `find` and `findOne` operations. If not defined, `pool` will be used
     */
    constructor({
                    modelSchema,
                    modelSchemasByGlobalId,
                    modelClassesByGlobalId,
                    pool,
                    readonlyPool,
                }) {
        this._modelSchemasByGlobalId = modelSchemasByGlobalId;
        this._modelClassesByGlobalId = modelClassesByGlobalId;
        this._schema = modelSchema;
        this._pool = pool;
        this._readonlyPool = readonlyPool;
        this._instanceFunctions = [];
        this._floatProperties = [];
        this._intProperties = [];
        this._hasInstanceFunctions = false;
        this._instance = {};

        for (const [name, value] of Object.entries(this._schema.attributes)) {
            if (_.isFunction(value)) {
                this._hasInstanceFunctions = true;
                this._instance[name] = value;
            } else if (value.type === 'float') {
                this._floatProperties.push(name);
            } else if (value.type === 'int' || value.type === 'integer') {
                this._intProperties.push(name);
            }
        }
    }

    /**
     * Easy access to schema attributes
     * @returns {Object}
     */
    get attributes() {
        return this._schema.attributes;
    }

    /**
     * Gets a single object
     * @param {Object} [args] - Arguments
     * @param {string[]} [args.select] - Array of model property names to return from the query.
     * @param {Object} [args.where] - Object representing the where query
     * @param {string|Object|string[]|Object[]} [args.sort] - Property name(s) to sort by
     */
    first(args = {}) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.first()`);
        let select;
        let where = {};
        let sort;
        for (const [name, value] of Object.entries(args)) {
            let isWhereCriteria = false;
            switch (name) {
                case 'select':
                    select = value;
                    break;
                case 'where':
                    where = value;
                    break;
                case 'sort':
                    sort = value;
                    break;
                default:
                    select = null;
                    where = args;
                    sort = null;
                    isWhereCriteria = true;
                    break;
            }

            if (isWhereCriteria) {
                break;
            }
        }

        const populates = [];
        const sorts = [];
        if (_.isArray(sort)) {
            sorts.push(...sort);
        } else if (sort) {
            sorts.push(sort);
        }

        const modelInstance = this;

        return {
            /**
             * Filters the query
             * @param {Object} value - Object representing the where query
             */
            where(value) {
                where = value;

                return this;
            },
            /**
             * Populates/hydrates relations
             * @param {string} propertyName - Name of property to join
             * @param {Object} [where] - Object representing the where query
             * @param {string|Object} [sort] - Property name(s) to sort by
             * @param {string|Number} [skip] - Number of records to skip
             * @param {string|Number} [limit] - Number of results to return
             */
            populate(propertyName, {
                where,
                sort,
                skip,
                limit,
            } = {}) {
                populates.push({
                    propertyName,
                    where,
                    sort,
                    skip,
                    limit,
                });

                return this;
            },
            /**
             * Sorts the query
             * @param {string|Object} value
             */
            sort(value) {
                sorts.push(value);

                return this;
            },
            async then(resolve, reject) {
                try {
                    const {
                        query,
                        params,
                    } = helper.getSelectQueryAndParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        select,
                        where,
                        sorts,
                        limit: 1,
                    });
                    await modelInstance._readonlyPool.query(query, params, function (err, rows) {
                        if (err) {
                            log.error(`[first error] ${err.message}`);
                            return resolve(null);
                        }
                        if (rows.length) {
                            const result = rows[0];
                            const populateQueries = [];
                            for (const populate of populates) {
                                const property = modelInstance._schema.attributes[populate.propertyName];
                                if (!property) {
                                    throw new Error(`Unable to find ${populate.propertyName} on ${modelInstance._schema.globalId} model for populating.`);
                                }

                                if (property.model) {
                                    const populateModel = modelInstance._modelClassesByGlobalId[property.model.toLowerCase()];
                                    if (!populateModel) {
                                        throw new Error(`Unable to find model by global id: ${property.model}`);
                                    }

                                    const primaryKeyName = helper.getPrimaryKeyPropertyName({
                                        schema: populateModel._schema,
                                    });

                                    const populateWhere = _.merge({
                                        [primaryKeyName]: result[populate.propertyName],
                                    }, populate.where);

                                    populateQueries.push(async function populateSingle() {
                                        result[populate.propertyName] = await populateModel.findOne({
                                            select: Model.select,
                                            where: populateWhere,
                                            sort: populate.sort,
                                        });
                                    }());
                                } else {
                                    const populateModel = modelInstance._modelClassesByGlobalId[property.collection.toLowerCase()];
                                    if (!populateModel) {
                                        throw new Error(`Unable to find model for collection by global id ${property.collection}. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                                    }

                                    const populateModelPrimaryKeyName = helper.getPrimaryKeyPropertyName({
                                        schema: populateModel._schema,
                                    });

                                    const primaryKeyName = helper.getPrimaryKeyPropertyName({
                                        schema: modelInstance._schema,
                                    });

                                    const id = result[primaryKeyName];
                                    if (_.isUndefined(id)) {
                                        throw new Error(`Primary key (${primaryKeyName}) has no value for model ${modelInstance._schema.globalId}.`);
                                    }

                                    if (property.through) {
                                        const throughModel = modelInstance._modelClassesByGlobalId[property.through.toLowerCase()];
                                        if (!throughModel) {
                                            throw new Error(`Unable to find model for multi-map collection by global id ${property.through}. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                                        }

                                        // TODO: After all models are setup so it's a one time instead of during each query
                                        let relatedModelProperty;
                                        for (const value of _.values(populateModel._schema.attributes)) {
                                            if (value.through && value.through.toLowerCase() === throughModel._schema.globalId.toLowerCase()) {
                                                relatedModelProperty = value;
                                                break;
                                            }
                                        }

                                        if (!relatedModelProperty) {
                                            throw new Error(`Unable to find property on related model for multi-map collection. For ${populate.propertyName} property of the ${modelInstance._schema.globalId} model.`);
                                        }

                                        populateQueries.push(async function populateMultiMapCollection() {
                                            const mapRecords = await throughModel.find({
                                                select: [relatedModelProperty.via],
                                                where: {
                                                    [property.via]: id,
                                                },
                                            });
                                            const ids = _.map(mapRecords, relatedModelProperty.via);

                                            const populateWhere = _.merge({
                                                [populateModelPrimaryKeyName]: ids,
                                            }, populate.where);

                                            result[populate.propertyName] = await populateModel.find({
                                                select: Model.select,
                                                where: populateWhere,
                                                sort: populate.sort,
                                                skip: populate.skip,
                                                limit: populate.limit,
                                            });
                                        }());
                                    } else {
                                        const populateWhere = _.merge({
                                            [property.via]: id,
                                        }, populate.where);

                                        populateQueries.push(async function populateCollection() {
                                            result[populate.propertyName] = await populateModel.find({
                                                select: Model.select,
                                                where: populateWhere,
                                                sort: populate.sort,
                                                skip: populate.skip,
                                                limit: populate.limit,
                                            });
                                        }());
                                    }
                                }
                            }

                            if (populateQueries.length) {
                                Promise.all(populateQueries);
                            }

                            return resolve(result);
                        }else {
                            return resolve(null);
                        }
                    });
                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        };
    }

    /**
     * Gets a collection of objects
     * @param {Object} [args] - Arguments
     * @param {string[]} [args.select] - Array of model property names to return from the query.
     * @param {Object|string} [args.where] - Object representing the where query
     * @param {string|Object|string[]|Object[]} [args.sort] - Property name(s) to sort by
     * @param {string|Number} [args.skip] - Number of records to skip
     * @param {string|Number} [args.limit] - Number of results to return
     */
    find(args = {}) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.find()`);
        let select;
        let where = {};
        let sort;
        let skip;
        let limit;
        for (const [name, value] of Object.entries(args)) {
            let isWhereCriteria = false;
            switch (name) {
                case 'select':
                    select = value;
                    break;
                case 'where':
                    where = value;
                    break;
                case 'sort':
                    sort = value;
                    break;
                case 'skip':
                    skip = value;
                    break;
                case 'limit':
                    limit = value;
                    break;
                default:
                    select = null;
                    where = args;
                    sort = null;
                    skip = null;
                    limit = null;
                    isWhereCriteria = true;
                    break;
            }

            if (isWhereCriteria) {
                break;
            }
        }

        const sorts = [];
        if (_.isArray(sort)) {
            sorts.push(...sort);
        } else if (sort) {
            sorts.push(sort);
        }

        const modelInstance = this;

        return {
            /**
             * Filters the query
             * @param {Object} value - Object representing the where query
             */
            where(value) {
                where = value;

                return this;
            },
            /**
             * Sorts the query
             * @param {string|Object} value
             */
            sort(value) {
                sorts.push(value);

                return this;
            },
            /**
             * Limits results returned by the query
             * @param {string|Number} value
             */
            limit(value) {
                limit = value;

                return this;
            },
            /**
             * Skips records returned by the query
             * @param {string|Number} value
             */
            skip(value) {
                skip = value;

                return this;
            },
            /**
             * Pages records returned by the query
             * @param {Number} [page=1] - Page to return - Starts at 1
             * @param {Number} [limit=10] - Number of records to return
             */
            paginate({
                         page = 1,
                         limit = 10,
                     }) {
                const safePage = Math.max(page, 1);
                this.skip((safePage * limit) - limit).limit(limit);

                return this;
            },
            async then(resolve, reject) {
                try {
                    const {
                        query,
                        params,
                    } = helper.getSelectQueryAndParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        select,
                        where,
                        sorts,
                        skip,
                        limit,
                    });

                    await modelInstance._readonlyPool.query(query, params, function (err, rows) {
                        if (err) {
                            log.error(`[find error] ${err.message}`);
                            return resolve(null);
                        }
                        resolve(modelInstance._buildInstances(rows));
                    });
                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        };
    }

    /**
     * query
     *
     * @param { string } query
     * @param { array } params
     * @returns {*}
     */
    query(query, params = []) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.query()`);
        if (!_.isString(query)) {
            return null;
        }
        if (!_.isArray(params)) {
            return null;
        }
        const modelInstance = this;
        return {
            query(value) {
                query = value;
            },
            params(value) {
                params = value;
            },
            async then(resolve, reject) {
                try {
                    await modelInstance._pool.query(query, params, function (err, rows) {
                        if (err) {
                            log.error(`[query error] ${err.message}`);
                            return resolve(null);
                        }
                        return resolve(rows);
                    });
                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        }
    }

    /**
     * Gets a count of rows matching the where query
     * @param {Object} [where] - Object representing the where query
     * @returns {Number} Number of records matching the where criteria
     */
    count(where) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.count()`);
        const modelInstance = this;

        return {
            /**
             * Filters the query
             * @param {Object} value - Object representing the where query
             */
            where(value) {
                where = value;

                return this;
            },
            async then(resolve, reject) {
                try {
                    const {
                        query,
                        params,
                    } = helper.getCountQueryAndParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        where,
                    });

                    await modelInstance._pool.query(query, params, function (err, rows) {
                        if (err) {
                            log.error(`[count error] ${err.message}`);
                            return resolve(null);
                        }
                        const originalValue = rows[0].count;
                        const value = Number(originalValue);
                        if (_.isFinite(value) && Number.isSafeInteger(value)) {
                            return resolve(value);
                        }
                        return resolve(originalValue);
                    });

                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        };
    }

    /**
     * Gets a max of rows matching the where query
     * @param {string} param
     * @param {Object} [where] - Object representing the where query
     * @returns {Number} Number of records matching the where criteria
     */
    max(param,where){
        const {
            stack,
        } = new Error(`${this._schema.globalId}.max()`);
        const modelInstance = this;
        if(!_.isString(param)){
            return null;
        }

        return {
            where(value) {
                where = value;
                return this;
            },
            param(value){
                param = value;
                return this;
            },
            async then(resolve, reject) {
                try {
                    const {
                        query,
                        params,
                    } = helper.getMaxQueryAndParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        where,
                        param
                    });

                    await modelInstance._pool.query(query, params, function (err, rows) {
                        if (err) {
                            log.error(`[max error] ${err.message}`);
                            return resolve(null);
                        }
                        if(rows.length) {
                            const originalValue = rows[0][param];
                            const value = Number(originalValue);
                            if (_.isFinite(value) && Number.isSafeInteger(value)) {
                                return resolve(value);
                            }
                            return resolve(originalValue);
                        }else {
                            return resolve(0);
                        }
                    });
                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        };
    }


    /**
     * Gets a min of rows matching the where query
     * @param {string} param
     * @param {Object} [where] - Object representing the where query
     * @returns {Number} Number of records matching the where criteria
     */
    min(param,where){
        const {
            stack,
        } = new Error(`${this._schema.globalId}.max()`);
        const modelInstance = this;
        if(!_.isString(param)){
            return null;
        }

        return {
            where(value) {
                where = value;
                return this;
            },
            param(value){
                param = value;
                return this;
            },
            async then(resolve, reject) {
                try {
                    const {
                        query,
                        params,
                    } = helper.getMinQueryAndParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        where,
                        param
                    });

                    await modelInstance._pool.query(query, params, function (err, rows) {
                        if (err) {
                            log.error(`[min error] ${err.message}`);
                            return resolve(null);
                        }
                        if(rows.length) {
                            const originalValue = rows[0][param];
                            const value = Number(originalValue);
                            if (_.isFinite(value) && Number.isSafeInteger(value)) {
                                return resolve(value);
                            }
                            return resolve(originalValue);
                        }else {
                            return resolve(0);
                        }
                    });
                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        };
    }

    /**
     * Creates an object using the specified values
     * @param {Object|Object[]} values - Values to insert as a new object. If an array is specified, multiple rows will be inserted
     * @param {boolean} getLastInsertId
     * @returns {Object} Return value from the db
     */
    async insert(values, getLastInsertId = false) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.create()`);
        if (_.isArray(values) && !values.length) {
            return false;
        }
        const modelInstance = this;
        return {
            values(value) {
                values = value;
                return this;
            },
            getLastInsertId(value) {
                getLastInsertId = value;
                return this;
            },
            async then(resolve, reject) {
                try {
                    const beforeCreate = modelInstance._schema.beforeCreate || modelInstance._schema.attributes.beforeCreate;
                    if (beforeCreate) {
                        values = await beforeCreate(values);
                    }
                    const {
                        query,
                        params,
                    } = helper.getInsertParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        values
                    });

                    await modelInstance._pool.query(query, params, function (err, result) {
                        if (err) {
                            log.error(`[insert error]${err.message}`);
                            return resolve(null);
                        }
                        if (getLastInsertId) {
                            return resolve(result.insertId);
                        } else {
                            return resolve(true);
                        }
                    });

                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        }
    }

    /**
     * Updates object(s) matching the where query, with the specified values
     * @param {Object} where - Object representing the where query
     * @param {Object} values - Values to update
     * @returns {Object[]} Return values from the db or `true` if returnRecords=false
     */
    async update(where, values) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.update()`);
        if (_.isArray(values) && !values.length) {
            return false;
        }
        if (_.isString(where)) {
            return false;
        }
        const modelInstance = this;
        return {
            where(value) {
                where = value;
                return this;
            },
            values(value) {
                values = value;
                return this;
            },
            async then(resolve, reject) {
                try {
                    const beforeUpdate = modelInstance._schema.beforeUpdate || modelInstance._schema.attributes.beforeUpdate;
                    if (beforeUpdate) {
                        values = await beforeUpdate(values);
                    }
                    const {
                        query,
                        params,
                    } = helper.getUpdateParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        where,
                        values
                    });

                    await modelInstance._pool.query(query, params, function (err, result) {
                        if (err) {
                            log.error(`[update error]${err.message}`);
                            return resolve(null);
                        }
                        return resolve(true);
                    });

                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        }
    }

    /**
     * delete object(s) matching the where query
     * @param {Object} where - Object representing the where query
     * @returns {Object[]|Boolean} Records affected or `true` if returnRecords=false
     */
    delete(where) {
        const {
            stack,
        } = new Error(`${this._schema.globalId}.destroy()`);
        const modelInstance = this;

        return {
            /**
             * Filters the query
             * @param {Object} value - Object representing the where query
             */
            where(value) {
                where = value;

                return this;
            },
            async then(resolve, reject) {
                try {
                    if (_.isString(where)) {
                        return false;
                    }

                    const {
                        query,
                        params,
                    } = helper.getDeleteQueryAndParams({
                        modelSchemasByGlobalId: modelInstance._modelSchemasByGlobalId,
                        schema: modelInstance._schema,
                        where
                    });

                    await modelInstance._pool.query(query, params,function (err,result) {
                        if(err){
                            log.error(`[delete error] ${err.message}`);
                            return resolve(false);
                        }
                        return resolve(true);
                    });
                } catch (ex) {
                    ex.stack += stack;
                    reject(ex);
                }
            },
        };
    }

    /**
     * Attach instance functions to specified results
     * @param {Object|Object[]} results
     * @private
     */
    _buildInstances(results) {
        if (_.isNil(results)) {
            return results;
        }

        if (!this._hasInstanceFunctions && !this._floatProperties.length && !this._intProperties.length) {
            return results;
        }

        if (_.isArray(results)) {
            return results.map(result => this._buildInstance(result));
        }

        return this._buildInstance(results);
    }

    /**
     * Attach instance functions to specified results
     * @param {Object} result
     * @returns {Object} Instance of model object
     * @private
     */
    _buildInstance(result) {
        if (_.isNil(result)) {
            return result;
        }

        let instance = result;
        if (this._hasInstanceFunctions) {
            // Inherit functions defined in the `this._instance` object and assign values from `result`
            instance = _.create(this._instance, result);
        }

        for (const name of this._floatProperties) {
            const originalValue = result[name];
            if (originalValue !== null) {
                try {
                    const value = Number(originalValue);
                    if (_.isFinite(value) && value.toString() === originalValue) {
                        instance[name] = value;
                    }
                } catch (ex) {
                    // Ignore and leave value as original
                }
            }
        }

        for (const name of this._intProperties) {
            const originalValue = result[name];
            if (originalValue !== null) {
                try {
                    const valueAsNumber = Number(originalValue);
                    if (_.isFinite(valueAsNumber) && valueAsNumber.toString() === originalValue) {
                        const valueAsInt = _.toInteger(valueAsNumber);
                        if (Number.isSafeInteger(valueAsInt)) {
                            instance[name] = valueAsInt;
                        }
                    }
                } catch (ex) {
                    // Ignore and leave value as original
                }
            }
        }

        return instance;
    }
};
