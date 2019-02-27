'use strict';

function loadRoutes(){
    const fs = require("fs");
    let routesFile = fs.readdirSync(__dirname + "/../app/routes");
    let routes = {};
    let __ = require("lodash");
    for (let i = 0; i < routesFile.length; i++) {
        let file = routesFile[i];
        if(file.endsWith(".js")){
            routes = __.extend(routes,require(`${__dirname}/../app/routes/${file}`));
        }
    }
    return routes;
}
module.exports = loadRoutes();
