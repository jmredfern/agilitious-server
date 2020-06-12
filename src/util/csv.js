'use strict';

const csv = require('csvtojson/v2');
const uuid = require('uuid');

const util = {};

const mapFields = (json) => ({
	id: uuid.v4(),
	acceptanceCriteria: json['Custom field (Acceptance Criteria)'],
	created: new Date(json.Created).getTime(),
	currentPoints: parseInt(json['Custom field (Story Points)'], 10),
	description: json.Description,
	epicId: '', // need to make a second loop on the issues to find the uuid for the epic based on epicKey
	epicKey: json['Custom field (Epic Link)'],
	key: json['Issue key'],
	originalPoints: parseInt(json['Custom field (Story Points)'], 10),
	reporter: json.Reporter,
	status: json.Status,
	title: json.Summary,
	type: json['Issue Type'],
});

const assignEpicId = (issue, issues) => {
	if (!issue.epicKey) {
		return issue;
	}
	const epic = issues.find((i) => i.key === issue.epicKey);
	if (!epic) {
		return issue;
	}
	return {
		...issue,
		epicId: epic.id,
	};
};

util.getIssuesFromCSV = async ({ issuesCSV }) => {
	const readIssues = await csv().fromString(issuesCSV);
	const issues = readIssues.map(mapFields);
	return issues.map((issue) => assignEpicId(issue, issues));
};

module.exports = util;
