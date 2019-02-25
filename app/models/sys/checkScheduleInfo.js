'use strict';

module.exports = {
    identity: 'checkScheduleInfo',
    tableName: 't_check_schedule_info',
    schema: true,
    autoUpdatedAt: true,
    autoCreatedAt: true,
    attributes:{
        orderId:{
            type: 'string',
            unique: true,
            primaryKey: true,
            columnName:"order_id"
        },
        order:{
            type: "int",
            required: true
        },
        shiftDate:{
            type:"date",
            required: true,
            columnName:"shift_date",
        },
        shiftTime:{
            type:"string",
            required:true,
            columnName: "shift_time"
        },
        state:{
            type:"int",
            required:true
        },
        type:{
            type:"int",
            required:true
        },
        queueId:{
            type:"int",
            required:true,
            columnName:"queue_id"
        },
        scid:{
            type:"int",
            required:true,
        },
        sctsId:{
            type:"int",
            required:true,
            columnName:"scts_id"
        },
        sctsName:{
            type:"int",
            required:true,
            columnName:"scts_name",
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