'use strict';

module.exports = {
    //10001-检查-排班列表
    'post /check/schedule/list': 'check\\ScheduleController.getList',
    //10002-检查-排班详细
    'post /check/schedule/info': 'check\\ScheduleController.getInfo',
    //10003-检查-取号
    'post /check/schedule/take': 'check\\OrderController.takeOrder',
    //10004-检查-预约
    'post /check/schedule/occupy': 'check\\OrderController.occupyOrder',
    //10005-检查-取消
    'post /check/schedule/cancel': 'check\\OrderController.cancelOrder',
    //10006-检查-完成
    'post /check/schedule/finish': 'check\\OrderController.finishOrder',
};
