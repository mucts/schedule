'use strict';

const config = {
    //监听端口
    port: 8080,
    //可以指定允许跨域访问的域名
    allowOrigin: "*",
    ///预约限制
    scheduleRules: {
        beginDay: 0,//开始时间 可预约开始日期 0-当天可预约 1-只能预约明天及其之后号源 以此类推
        todayLimitTime: 0,//限制时间 单位：秒 0-大于等于当前时间 1800-可预约30分钟以后号源
        days: 7//可预约天数 单位：天
    }
};

module.exports = config;
