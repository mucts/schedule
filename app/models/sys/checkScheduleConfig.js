'use strict';

module.exports = {
    identity: 'checkScheduleConfig',
    tableName: 't_check_schedule_config',
    schema: true,
    autoUpdatedAt: false,
    autoCreatedAt: false,
    attributes: {
        scid: {
            type: 'int',
            unique: true,
            primaryKey: true,
        },
        queueId: {
            type: 'int',
            required: true,
            columnName:"queue_id"
        },
        weekId: {
            type: "int",
            required: true,
            columnName: "week_id"
        },
        scType: {
            type: "int",
            required: true,
            columnName: "sc_type"
        },
        scDate: {
            type: "date",
            columnName: "sc_date"
        },
        scState: {
            type: "int",
            columnName: "sc_state"
        },
        scValue: {
            type: "int",
            columnName: "sc_value"
        },
        isDelete: {
            type: "int",
            columnName: "is_delete"
        },
        opAdminId: {
            type: "int",
            columnName: "op_admin_id"
        },
        updTime: {
            type: "int",
            columnName: "upd_time"
        },
        insertTime: {
            type: "int",
            required: true,
            columnName: "insert_time"
        }
    }
};
