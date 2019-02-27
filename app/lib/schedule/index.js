'use strict';

const config = KoaConfig.config.scheduleRules;
require("date-utils");
const Lock = require("../../utils/lock");
const lock = new Lock();
/**
 * 是否可以预约
 *
 * @param {string} shiftDate 预约时间
 * @returns {boolean}
 */
const inAppointTime = function (shiftDate) {
    if (typeof config === "object" && config.days > 0 && config.beginDay >= 0) {
        let shiftTime = new Date(shiftDate).getTime();
        let beginTime = new Date((new Date()).add({days: config.beginDay}).toFormat("YYYY-MM-DD")).getTime();
        let endTime = new Date((new Date()).add({days: (config.beginDay + config.days - 1)}).toFormat("YYYY-MM-DD")).getTime();
        if (endTime >= shiftTime && beginTime <= shiftTime) {
            return true;
        }
    }
    return false;
};

/**
 * 请求加锁
 * @param key
 * @returns {Promise<*>}
 */
async function requireLock(key = "") {
    return new Promise(resolve => {
        lock.requireLock(key, releaseRef => {
            resolve(releaseRef);
        })
    });
}

/**
 * 订单ID
 * @param sctsId
 * @param order
 * @returns {Promise<string>}
 */
const createOrderId = async function (sctsId, order) {
    let today = new Date();
    sctsId = sctsId.toString();
    while (sctsId.length < 5) {
        sctsId = `0${sctsId}`;
    }
    sctsId = sctsId.substring(sctsId.length, -5);
    order = order.toString();
    while (order.length < 7) {
        order = `0${order}`;
    }
    order = order.substring(order.length, -7);
    let time = (today.clone().getTime() - (new Date(today.clone().toFormat("YYYY-MM-DD 00:00:00")).getTime())).toString();
    while (time.length < 8) {
        time = `0${time}`;
    }
    time = time.substring(time.length, -8);
    return `${today.clone().toFormat("YYMMDD")}${sctsId}${order}${time}`;
};
/**
 * 预约下单
 * @param {Object} orm
 * @param {number} queueId
 * @param {string} shiftDate
 * @param {number} type
 * @param {number} order
 * @param {number} sctsId
 * @returns {Promise<{code: number, message: string, info: (boolean|*)}>}
 */
const doOrder = async function (orm, queueId, type = 1, shiftDate = new Date().toFormat("YYYY-MM-DD"), order = 0, sctsId = 0) {
    const lockRef = await requireLock(queueId);
    let lat = await inAppointTime(shiftDate), time, scid, code, message, info, sctsName, result = 0;
    try {
        if (lat) {
            let queueInfo = await orm.sys.checkQueueInfo.first({id: queueId});
            if (!queueInfo) {
                return {
                    code: KoaConfig.constant.badRequest,
                    message: "排班队列不存在"
                }
            }
            if (type === 1) {
                if (queueInfo.supportAppointment !== 1) {
                    return {
                        code: KoaConfig.constant.badRequest,
                        message: "该排班队列不开放预约"
                    }
                }
                result = await orm.sys.checkScheduleInfo.count({
                    shiftDate: shiftDate,
                    queueId: queueId,
                    order: order,
                    state: [1, 3, 4]
                });
            }
            if (result === 0) {
                result = await getTimeSlot(orm, queueId, shiftDate, type !== 1 && queueInfo.supportTakeOver !== 0);
                if (result.remaining) {
                    for (const i in result.timeSlot) {
                        if (type === 2) {
                            if (result.timeSlot[i].time_point.length) {
                                time = result.timeSlot[i].time_point[0].time;
                                order = result.timeSlot[i].time_point[0].order;
                                sctsId = result.timeSlot[i].scts_id;
                                sctsName = result.timeSlot[i].scts_name;
                                scid = result.timeSlot[i].scid;
                                break;
                            }
                        } else if (type === 1 && result.timeSlot[i].scts_id == sctsId) {
                            if (result.timeSlot[i].time_point.length) {
                                for (const j in result.timeSlot[i].time_point) {
                                    if (result.timeSlot[i].time_point[j].order == order) {
                                        time = result.timeSlot[i].time_point[j].time;
                                        scid = result.timeSlot[i].scid;
                                        sctsName = result.timeSlot[i].scts_name;
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                    }
                } else {
                    code = KoaConfig.constant.badRequest;
                    message = type === 2 ? "该时间段内无可预约号源" : "排班调整或者号源信息错误";
                }
            } else {
                code = KoaConfig.constant.badRequest;
                message = "号源已被占用";
            }
            if (time && order && sctsId && queueId && scid && shiftDate) {
                let orderId = await createOrderId(sctsId, order);
                result = await orm.sys.checkScheduleInfo.insert([{
                    orderId: orderId,
                    order: order,
                    shiftDate: shiftDate,
                    shiftTime: time,
                    state: type === 1 ? 1 : 3,
                    type: type,
                    queueId: queueId,
                    scid: scid,
                    sctsId: sctsId,
                    sctsName: sctsName
                }]);
                if (result) {
                    let row = await orm.sys.checkScheduleInfo.first({orderId: orderId});
                    if (typeof row === "object") {
                        const _ = require('lodash');
                        orm.log.logCheckScheduleInfo.insert(_.merge(row, {logTime: parseInt(new Date().getTime() / 1000)}));
                        info = {
                            order_id: orderId,
                            order: order,
                            shift_date: shiftDate,
                            shift_time: time,
                            state: type === 1 ? 1 : 3,
                            type: type,
                            scts_name: sctsName,
                            scts_id: sctsId,
                            insert_time: row.insertTime
                        }
                    }
                } else {
                    code = KoaConfig.constant.badRequest;
                    message = "订单处理异常";
                }
            }

            if (typeof info === "object") {
                code = KoaConfig.constant.success;
                message = "success";
            }
        }
    } finally {
        lockRef();
    }
    return {
        code: code || KoaConfig.constant.badRequest,
        message: message || "排班调整或者号源信息错误",
        info: info
    }
};
/**
 * 获取号源时间点
 *
 * @param {Object} orm 数据库orm
 * @param {number} queueId 队列ID
 * @param {string} shiftDate 排班时间
 * @param {Boolean} isTake 是否是取号
 * @returns {{timeSlot: Array, remaining: number}}
 */
const getTimeSlot = async function (orm, queueId, shiftDate = new Date().toFormat("YYYY-MM-DD"), isTake = true) {
    let week = new Date(shiftDate).getDay();
    let scheduleConfig = await orm.sys.checkScheduleConfig.first({
        scType: 2,
        scDate: shiftDate,
        queueId: queueId,
        isDelete: 0,
        scState: 1
    });
    if (!scheduleConfig) {
        scheduleConfig = await orm.sys.checkScheduleConfig.first({
            scType: 1,
            queueId: queueId,
            weekId: week,
            isDelete: 0,
            scState: 1
        });
    }
    let timeSlotConfig, usedList;
    if (scheduleConfig) {
        timeSlotConfig = await orm.sys.checkScheduleTimeSlotConfig.find({
            scid: scheduleConfig.scid,
            isDelete: 0
        });
        usedList = await orm.sys.checkScheduleInfo.find({
            shiftDate: shiftDate,
            queueId: queueId,
            state: [1, 3, 4]
        });
    }
    let timeSlot = [], remaining = 0, status = 3;
    if (typeof scheduleConfig === "object" && timeSlotConfig && shiftDate) {
        if (scheduleConfig.scValue - usedList.length > 0) {
            let length = 0;
            for (const i in timeSlotConfig) {
                timeSlotConfig[i].sctsBegenTime = new Date(`${shiftDate} ${timeSlotConfig[i].sctsBegenDt}`);
                timeSlotConfig[i].sctsEndTime = new Date(`${shiftDate} ${timeSlotConfig[i].sctsEndDt}`);
                length += timeSlotConfig[i].sctsEndTime.getTime() - timeSlotConfig[i].sctsBegenTime.getTime();
            }
            let interval = parseInt(length / scheduleConfig.scValue);
            let order = 1;
            let time, timePoint, had;
            for (const i in timeSlotConfig) {
                timePoint = [];
                time = timeSlotConfig[i].sctsBegenTime.clone();
                while (order <= scheduleConfig.scValue && time.getTime() <= timeSlotConfig[i].sctsEndTime.getTime()) {
                    had = false;
                    if (usedList) {
                        for (const j in usedList) {
                            if (usedList[j].order === order) {
                                had = true;
                                break;
                            }
                        }
                    }
                    if (!isTake && (time.getTime() + (config.todayLimitTime * 1000) < (new Date().getTime()))) {
                        had = true;
                    }
                    if (!had) {
                        timePoint.push({
                            order: order,
                            time: time.clone().toFormat("HH24:MI:SS")
                        });
                        remaining++;
                    }
                    time.add({milliseconds: interval});
                    order++;
                }
                if (timePoint.length) {
                    timeSlot.push({
                        scid: timeSlotConfig[i].scid,
                        scts_id: timeSlotConfig[i].sctsId,
                        scts_name: timeSlotConfig[i].sctsName,
                        time_point: timePoint
                    });
                }
            }
            if (usedList.length > 0 && remaining > 0) {
                for (let i = usedList.length - 1; i >= 0; i--) {
                    if (usedList[i].order > order) {
                        for (let j = timeSlot.length - 1; j >= 0; j--) {
                            if (timeSlot[j].time_point.length > 0) {
                                timeSlot[j].time_point.splice(timeSlot[j].time_point.length - 1, 1);
                                break;
                            }
                        }
                    } else {
                        break;
                    }
                }
            }
        }
        status = remaining ? 1 : 2;
    }
    return {timeSlot, remaining, status, week};
};
module.exports = {
    config,
    inAppointTime,
    getTimeSlot,
    doOrder
};
