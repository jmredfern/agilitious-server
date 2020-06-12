'use strict';

const log4js = require('log4js');

log4js.configure({
  appenders: { out: { type: 'stdout', layout: { type: 'basic' } } },
  categories: { default: { appenders: ['out'], level: 'info' } }
});

const logger = {};

const getFilename = ({ url }) => {
  const pathname = new URL(url).pathname;
  return pathname.substring(pathname.lastIndexOf('/') + 1);
};

logger.getLoggerByUrl = ({ url }) => {
  const filename = getFilename({ url });
  return log4js.getLogger(filename);
};

logger.getLoggerByFilename = ({ filename }) => {
  return log4js.getLogger(filename);
};

module.exports = logger;
