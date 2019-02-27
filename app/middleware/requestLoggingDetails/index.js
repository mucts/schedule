'use strict';

module.exports = () => {
    return async function requestLoggingDetails(context, next) {
        context.state.getRequestLoggingDetails = function getRequestLoggingDetails() {
            const requestDetails = {
                url: context.url,
                ip: context.ip,
                userAgent: context.get('X-User-Agent') || context.get('User-Agent'),
                device: {
                    name: context.request.device.name,
                    type: context.request.device.type,
                },
            };

            if (context.request.device.parser && context.request.device.parser.useragent && context.request.device.parser.useragent.family !== 'Other') {
                requestDetails.device.browser = context.request.device.parser.useragent.toAgent();

                const osDetails = context.request.device.parser.useragent.os;
                if (osDetails && osDetails.family !== 'Other') {
                    requestDetails.device.os = osDetails.toString();
                }
            }

            if (context.state.user) {
                if (context.state.user.id) {
                    requestDetails.userId = context.state.user.id;
                    if (context.state.user.username) {
                        requestDetails.username = context.state.user.username;
                    } else if (context.state.user.email) {
                        requestDetails.email = context.state.user.email;
                    }
                } else {
                    requestDetails.userId = context.state.user;
                }
            }

            return requestDetails;
        };

        await next();
    };
};
