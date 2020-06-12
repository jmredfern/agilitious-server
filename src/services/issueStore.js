'use strict';

const logger = require('../util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const { getIssuesFromCSV } = require('../util/csv.js');

const store = {};
const util = {};

util.storeCSVIssues = async ({ gameId, issuesCSV }) => {
	const issues = await getIssuesFromCSV({ issuesCSV });
	store[gameId] = issues;
};

util.getCSVIssues = ({ gameId }) => {
	// TBD
};

util.getIssues = ({ gameId }) => {
	return store[gameId];
};

module.exports = util;
