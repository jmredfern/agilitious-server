'use strict';

import csvToJSON from 'csvtojson/v2';
import { Issue, JSONIssue, Comment } from '../types';

const mapCSVExportFields = (issue: JSONIssue): Issue => ({
	id: issue['Issue id'],
	acceptanceCriteria: issue['Custom field (Acceptance Criteria)'],
	comments: [],
	created: new Date(issue.Created).getTime(),
	currentPoints: parseInt(issue['Custom field (Story Points)'], 10),
	description: issue.Description,
	epicId: '', // need to make a second loop on the issues to find the uuid for the epic based on epicKey
	epicKey: issue['Custom field (Epic Link)'],
	key: issue['Issue key'],
	originalPoints: parseInt(issue['Custom field (Story Points)'], 10),
	reporter: issue.Reporter,
	status: issue.Status,
	title: issue.Summary,
	type: issue['Issue Type'],
});

const mapComments = (comments: any): Comment[] =>
	comments.map((comment: any) => ({
		author: comment.author.displayName,
		body: comment.body,
	}));

const mapAPIRequestFields = (issue: any): Issue => ({
	id: issue.id,
	acceptanceCriteria: issue.namedRenderedFields['Acceptance Criteria'],
	comments: mapComments(issue.renderedFields.comment.comments),
	created: new Date(issue.fields.created).getTime(),
	currentPoints: parseInt(issue.namedFields['Story Points'], 10),
	description: issue.renderedFields.description,
	epicId: '', // need to make a second loop on the issues to find the uuid for the epic based on epicKey
	epicKey: issue.namedFields['Epic Link'],
	key: issue.key,
	originalPoints: parseInt(issue.namedFields['Story Points'], 10),
	reporter: issue.fields.reporter.displayName,
	status: issue.fields.status.name,
	title: issue.fields.summary,
	type: issue.fields.issuetype.name,
});

const assignEpicId = (issue: Issue, issues: Array<Issue>): Issue => {
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

export const mapCSVExportToIssues = async (issuesFromCSVExport: string): Promise<Array<Issue>> => {
	const csvExportAsJSON = await csvToJSON().fromString(issuesFromCSVExport);
	const issues = csvExportAsJSON.map(mapCSVExportFields);
	return issues.map((issue: Issue) => assignEpicId(issue, issues));
};

export const mapAPIRequestToIssues = (issuesFromAPIRequest: any): Array<Issue> => {
	const issues = issuesFromAPIRequest.map(mapAPIRequestFields);
	return issues.map((issue: Issue) => assignEpicId(issue, issues));
};
