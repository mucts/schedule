'use strict';

const database = {
    sys: {//系统库
        host: "10.254.33.107",
        port: 3306,
        database: "db_queue_sys",
        user: "root",
        password: "longmaster",
        charset: "utf8mb4",
        collation: "utf8mb4_general_ci",
        ssl: false
    },
    log: {//日志库
        host: "10.254.33.107",
        port: 3306,
        database: "db_queue_log",
        user: "root",
        password: "longmaster",
        charset: "utf8mb4",
        collation: "utf8mb4_general_ci",
        ssl: false
    }
};
module.exports = database;
