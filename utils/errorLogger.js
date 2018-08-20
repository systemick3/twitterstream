var winston = require('winston');
//winston.emitErrs = true;

//var errorLogger = new winston.Logger({
var errorLogger = winston.createLogger({
  transports: [
    new winston.transports.File({
        level: 'error',
        filename: './logs/error.log',
        handleExceptions: true,
        exitOnError: false,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: false
    }),
  ],
});

module.exports = errorLogger;
module.exports.errorStream = {
    write: function(message, encoding){
        logger.error(message);
    }
};
