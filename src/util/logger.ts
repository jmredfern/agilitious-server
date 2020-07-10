'use strict';

import log4js from 'log4js';

log4js.configure({
  appenders: { out: { type: 'stdout', layout: { type: 'basic' } } },
  categories: { default: { appenders: ['out'], level: 'info' } }
});

const getFilename = (url: string): string => {
  const pathname = new URL(url).pathname;
  return pathname.substring(pathname.lastIndexOf('/') + 1);
};

const getLoggerByUrl = (url: string): log4js.Logger => {
  const filename = getFilename(url);
  return log4js.getLogger(filename);
};

const getLoggerByFilename = (filename: string): log4js.Logger => {
  return log4js.getLogger(filename);
};

export default { getLoggerByUrl, getLoggerByFilename };
