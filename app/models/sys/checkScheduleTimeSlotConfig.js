'use strict';

module.exports = {
    identity: 'checkScheduleTimeSlotConfig',
    tableName: 't_check_schedule_time_slot_config',
    schema: true,
    autoUpdatedAt: false,
    autoCreatedAt: false,
    attributes: {
        sctsId: {
            type: 'int',
            unique: true,
            primaryKey: true,
            columnName:"scts_id"
        },
        sctsName:{
            type: "string",
            required: true,
            columnName: "scts_name"
        },
        sctsBegenDt:{
            type:"string",
            required: true,
            columnName:"scts_begen_dt"
        },
        sctsEndDt:{
            type:"string",
            required:true,
            columnName:"scts_end_dt"
        },
        scid:{
            type:"int",
            required:true,
        },
        isDelete:{
            type:"int",
            required:true,
            columnName:"is_delete"
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