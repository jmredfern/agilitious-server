'use strict';

import csv from 'csvtojson/v2';
import { v4 as uuidv4 } from 'uuid';
import { Issue } from '../types';

const mapFields: (json: { [key: string]: any }) => Issue = json => ({
	id: uuidv4(),
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

const assignEpicId = (issue: Issue, issues: Array<Issue>): Issue => {
	if (!issue.epicKey) {
		return issue;
	}
	const epic = issues.find(i => i.key === issue.epicKey);
	if (!epic) {
		return issue;
	}
	return {
		...issue,
		epicId: epic.id,
	};
};

export const getIssuesFromCSV = async (issuesCSV: string): Promise<Array<Issue>> => {
	const readIssues = await csv().fromString(issuesCSV);
	const issues = readIssues.map(mapFields);
	return issues.map((issue: Issue) => assignEpicId(issue, issues));
};
