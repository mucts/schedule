'use strict';

const sc = require("../../lib/schedule");

module.exports = {
    /**
     * 获取检查排班列表
     *
     * @param context
     * @returns {Promise<void>}
     */
    async getList(context) {
        const queueId = context.request.body.queue_id;
        if (!queueId) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入排班队列");
            return;
        }
        require("date-utils");
        let config = sc.config;
        if (typeof config === "object" && config.beginDay >= 0 && config.days > 0) {
            let today = new Date();
            let beginDate = today.clone().add({days: config.beginDay}).toFormat("YYYY-MM-DD");
            let endDate = today.clone().add({days: (config.days + config.beginDay - 1)}).toFormat("YYYY-MM-DD");
            let rows = await context.app.orm.sys.checkScheduleConfig.find(`queue_id = ${queueId} AND sc_state=1 AND is_delete = 0 AND (sc_type = 1 OR (sc_type= 2 AND sc_date BETWEEN '${beginDate}' AND '${endDate}'))`);
            let list = [];
            let day, shiftDay, week, status, scValue, used, remaining;
            for (let i = config.beginDay; i < (config.beginDay + config.days); i++) {
                day = today.clone().add({days: i});
                shiftDay = day.clone().toFormat("YYYY-MM-DD");
                week = day.clone().getDay();
                status = 3;
                scValue = 0;
                remaining = 0;
                used = 0;
                for (let j in rows) {
                    if (rows[j].scType === 2 && rows[j].scDate.clone().toFormat("YYYY-MM-DD") === shiftDay) {
                        scValue = rows[j].scValue;
                        status = 2;
                        break;
                    }
                }
                if (status === 3) {
                    for (let j in rows) {
                        if (rows[j].scType === 1 && rows[j].weekId === week) {
                            scValue = rows[j].scValue;
                            status = 2;
                            break;
                        }
                    }
                }


                if (status === 2) {
                    if (scValue > 0) {
                        used = await context.app.orm.sys.checkScheduleInfo.count({
                            shiftDate: shiftDay,
                            queueId: queueId,
                            state: [1, 3, 4]
                        })
                    }
                    remaining = scValue - used;
                    if (i === 0 && remaining) {
                        const result = await sc.getTimeSlot(context.app.orm, queueId, shiftDay, true);
                        remaining = result.remaining;
                        status = result.status;
                    }
                }
                list.push({date: shiftDay, week: week, remaining: remaining, state: status})
            }
            context.status = KoaConfig.constant.success;
            context.body = {
                code: KoaConfig.constant.success,
                message: "success",
                list: list
            };
        } else {
            context.status = KoaConfig.constant.noContent;
            context.body = {
                code: KoaConfig.constant.noContent,
                message: "该队列暂无排班数据"
            };
        }
    },

    /**
     * 获取检查排班详情
     *
     * @param context
     * @returns {Promise<void>}
     */
    async getInfo(context) {
        const queueId = context.request.body.queue_id;
        if (!queueId) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入排班队列");
            return;
        }
        const shiftDate = context.request.body.shift_date;
        if (!shiftDate) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入预约日期");
            return;
        }
        if (!/^([0-9]{3}[1-9]|[0-9]{2}[1-9][0-9]{1}|[0-9]{1}[1-9][0-9]{2}|[1-9][0-9]{3})-(((0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01]))|((0[469]|11)-(0[1-9]|[12][0-9]|30))|(02-(0[1-9]|[1][0-9]|2[0-8])))$/.test(shiftDate)) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入正确的预约时间");
            return;
        }
        if (!sc.inAppointTime(shiftDate)) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("该预约时间暂不放号");
            return;
        }
        let result = await sc.getTimeSlot(context.app.orm, queueId, shiftDate, true);
        context.status = KoaConfig.constant.success;
        context.body = {
            code: KoaConfig.constant.success,
            message: "success",
            info: {
                shift_date: shiftDate,
                week: result.week,
                remaining: result.remaining || 0,
                state: result.status || 3,
                time_slot: result.timeSlot || []
            }
        }
    },
};
