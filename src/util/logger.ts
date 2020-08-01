'use strict';

import log4js from 'log4js';

const TRIM_LENGTH = 1024;

const LOG_PATTERN = '%d %p %f{1} %[%m%]';

log4js.configure({
	appenders: { out: { type: 'stdout', layout: { type: 'pattern', pattern: LOG_PATTERN } } },
	categories: { default: { enableCallStack: true, appenders: ['out'], level: 'debug' } },
});

const getFilename = (url: string): string => {
	const pathname = new URL(url).pathname;
	return pathname.substring(pathname.lastIndexOf('/') + 1);
};

export const getLoggerByUrl = (url: string): log4js.Logger => {
	const filename = getFilename(url);
	return log4js.getLogger(filename);
};

export const getLoggerByFilename = (filename: string): log4js.Logger => {
	return log4js.getLogger(filename);
};

export const trimString = (input: string): string => {
	if (input.length < TRIM_LENGTH) {
		return input;
	}
	return input.slice(0, TRIM_LENGTH) + '\n  ...';
};
