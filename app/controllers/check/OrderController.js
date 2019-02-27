'use strict';

const sc = require("../../lib/schedule");

module.exports = {
    /**
     * 检查预约占号
     *
     * @param context
     * @returns {Promise<void>}
     */
    async occupyOrder(context) {
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
        let sctsId = context.request.body.scts_id;
        if (!sctsId) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入号段编号");
            return;
        }
        let order = context.request.body.order;
        if (!order) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入号数");
            return;
        }
        let result = await sc.doOrder(context.app.orm, queueId, 1, shiftDate, order, sctsId);
        context.status = result.code || KoaConfig.constant.success;
        context.body = {
            code: result.code || KoaConfig.constant.success,
            message: result.message || "success",
            info: result.info
        }
    },
    /**
     * 检查取号
     *
     * @param context
     * @returns {Promise<void>}
     */
    async takeOrder(context) {
        const queueId = context.request.body.queue_id;
        if (!queueId) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入排班队列");
            return;
        }

        let result = await sc.doOrder(context.app.orm, queueId, 2);
        context.status = result.code || KoaConfig.constant.success;
        context.body = {
            code: result.code || KoaConfig.constant.success,
            message: result.message || "success",
            info: result.info
        }
    },
    /**
     * 检查取消号源
     *
     * @param context
     * @returns {Promise<void>}
     */
    async cancelOrder(context) {
        let orderId = context.request.body.order_id;
        if (!orderId) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入需要取消的订单编号");
            return;
        }
        let info = await context.app.orm.sys.checkScheduleInfo.first({orderId: orderId});
        if (typeof info !== "object") {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("订单不存在");
            return;
        }
        if (info.state === 2) {
            context.status = KoaConfig.constant.alreadyReported;
            context.body = {
                code: KoaConfig.constant.alreadyReported,
                message: "已有取消记录，请勿重复取消"
            };
            return;
        }
        if (info.state === 3) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("已签到记录无法取消");
            return;
        }
        let result = await context.app.orm.sys.checkScheduleInfo.update({orderId: orderId}, {state: 2});
        if (result) {
            info = await context.app.orm.sys.checkScheduleInfo.first({orderId: orderId});
            if (typeof info === "object") {
                const _ = require('lodash');
                context.app.orm.log.logCheckScheduleInfo.insert(_.merge(info, {logTime: parseInt(new Date().getTime() / 1000)}));
            }
            context.status = KoaConfig.constant.success;
            context.body = {
                code: KoaConfig.constant.success,
                message: "success"
            }
        } else {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("取消失败，请稍后再试！");
        }
    },
    /**
     * 检查使用号源
     *
     * @param context
     * @returns {Promise<void>}
     */
    async finishOrder(context) {
        let orderId = context.request.body.order_id;
        if (!orderId) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("请输入需要取消的订单编号");
            return;
        }
        let info = await context.app.orm.sys.checkScheduleInfo.first({orderId: orderId});
        if (typeof info !== "object") {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("订单不存在");
            return;
        }
        if (info.state === 3) {
            context.status = KoaConfig.constant.alreadyReported;
            context.body = {
                code: KoaConfig.constant.alreadyReported,
                message: "已有处理记录，请勿重复操作！"
            };
            return;
        }
        if (info.state === 2) {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("已取消记录无法操作！");
            return;
        }
        let result = await context.app.orm.sys.checkScheduleInfo.update({orderId: orderId}, {state: 3});
        if (result) {
            info = await context.app.orm.sys.checkScheduleInfo.first({orderId: orderId});
            if (typeof info === "object") {
                const _ = require('lodash');
                context.app.orm.log.logCheckScheduleInfo.insert(_.merge(info, {logTime: parseInt(new Date().getTime() / 1000)}));
            }
            context.status = KoaConfig.constant.success;
            context.body = {
                code: KoaConfig.constant.success,
                message: "success"
            }
        } else {
            context.status = KoaConfig.constant.badRequest;
            context.badRequest("取消失败，请稍后再试！");
        }
    },
};

