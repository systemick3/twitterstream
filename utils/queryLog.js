"use strict";

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: '../logs/error.log',
            timestamp: true
        })
    ]
});

var options = {
    from:   new Date - 24 * 60 * 60 * 1000,
    until:  new Date,
    limit:  10,
    start:  0,
    order:  'asc',
    fields: ['message']
};
logger.query(options, function (err, result) {
    if (err) {
        throw err;
    }

    console.log('Results...');
    console.log(result);
});