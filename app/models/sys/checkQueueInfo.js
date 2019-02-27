'use strict';

module.exports = {
    identity: 'checkQueueInfo',
    tableName: 't_check_queue_info',
    schema: true,
    autoUpdatedAt: false,
    autoCreatedAt: false,
    attributes: {
        id: {
            type: 'int',
            unique: true,
            primaryKey: true,
        },
        deptId: {
            type: 'string',
            required: true,
            columnName:"dept_id"
        },
        checkName: {
            type: "string",
            required: true,
            columnName: "check_name"
        },
        checkIds: {
            type: "string",
            required: true,
            columnName: "check_ids"
        },
        checkPrefix: {
            type: "string",
            columnName: "check_prefix"
        },
        icuFirst: {
            type: "int",
            columnName: "icu_first"
        },
        supportPriority: {
            type: "int",
            columnName: "support_priority"
        },
        supportAppointment: {
            type: "int",
            columnName: "support_appointment"
        },
        desc: {
            type: "string",
            columnName: "desc"
        },
        supportTakeOver: {
            type: "int",
            columnName: "support_take_over"
        },
        insertDt: {
            type: "datetime",
            required: true,
            columnName: "insert_dt"
        }
    }
};
