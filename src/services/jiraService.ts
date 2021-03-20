'use strict';

import _ from 'lodash';
import axios from 'axios';
import { TrackedEvent } from '../types';
import { getLoggerByFilename } from '../util/logger';
import { Logger } from 'log4js';
import config from 'config';

const log: Logger = getLoggerByFilename(__filename);

const PAGE_SIZE = 50;
const CHUNK_SIZE = 10;

const COMPANY_ATLASSIAN_URL = config.get('companyAtlassianURL');

// template parameters: (projectId: string)
const getIssueSearchJQL = _.template(
	'project = ${projectId} AND type != Sub-task AND resolution = Unresolved AND (Sprint is EMPTY OR Sprint not in ' +
		'openSprints()) ORDER BY key DESC',
);

// template parameters: (jiraCompanyName: string)
const getIssueSearchURL = _.template(COMPANY_ATLASSIAN_URL + '/rest/api/2/search');

// template parameters: (jiraCompanyName: string, issueId: string)
const getPutIssueURL = _.template(COMPANY_ATLASSIAN_URL + '/rest/api/2/issue/${issueId}');

const getHeaders = (email: string, apiToken: string): any => {
	const authorizationToken = Buffer.from(`${email}:${apiToken}`, 'utf8').toString('base64');
	return {
		Accept: 'application/json',
		Authorization: `Basic ${authorizationToken}`,
		'Content-Type': 'application/json;charset=UTF-8',
	};
};

const getIssuesCount = async (jql: string, url: string, headers: any): Promise<number> => {
	const response: any = await getIssuesPage(0, 0, jql, url, headers);
	return response.total;
};

const getIssuesPage = async (startAt: number, maxResults: number, jql: string, url: string, headers: any) => {
	const response = await axios({
		url,
		method: 'POST',
		headers,
		data: {
			expand: ['renderedFields', 'names'],
			fields: ['*navigable', 'comment'],
			jql,
			maxResults,
			startAt,
		},
	});
	return response.data;
};

const putIssue = async (url: string, headers: any, data: any) => {
	const response = await axios({
		url,
		method: 'PUT',
		headers,
		data,
	});
	return response.data;
};

export const getIssuesFromJira = async (
	jiraCompanyName: string,
	jiraProjectId: string,
	jiraEmail: string,
	jiraAPIToken: string,
): Promise<any> => {
	const issueSearchJQL = getIssueSearchJQL({ jiraProjectId });
	const issueSearchURL = getIssueSearchURL({ jiraCompanyName });
	const headers = getHeaders(jiraEmail, jiraAPIToken);
	const issuesCount = await getIssuesCount(issueSearchJQL, issueSearchURL, headers);
	const pageCount = Math.ceil(issuesCount / PAGE_SIZE);
	const chunks = _.chunk(Array.from(Array(pageCount).keys()), CHUNK_SIZE);

	const issues: any[] = [];

	for (const chunk of chunks) {
		const promises = chunk.map((pageId) => {
			return getIssuesPage(pageId * PAGE_SIZE, PAGE_SIZE, issueSearchJQL, issueSearchURL, headers);
		});
		const results = await Promise.all(promises);
		// TODO: handle request failure
		results.forEach((result: any) => {
			result.issues.forEach((issue: any) => {
				issue.namedRenderedFields = {};
				issue.namedFields = {};
				issue.fieldNames = {};
				for (const [key, value] of Object.entries(issue.renderedFields)) {
					issue.namedRenderedFields[result.names[key]] = value;
				}
				for (const [key, value] of Object.entries(issue.fields)) {
					issue.namedFields[result.names[key]] = value;
				}
				for (const [key, value] of Object.entries(result.names)) {
					issue.fieldNames[<string>value] = key;
				}
				issues.push(issue);
			});
		});
	}

	log.info(
		`Retrieved ${issues.length} issues from JIRA for company '${jiraCompanyName}', project '${jiraProjectId}'`,
	);

	return issues;
};

const getFieldName = (sourceIssues: any, issueId: any, fieldName: any): any => {
	const sourceIssue = sourceIssues.find((issue: any) => issue.id === issueId);
	return sourceIssue.fieldNames[fieldName];
};

export const updateIssuesInJira = async (
	events: Array<TrackedEvent>,
	jiraCompanyName: string,
	jiraEmail: string,
	jiraAPIToken: string,
	sourceIssues: any,
): Promise<void> => {
	const headers = getHeaders(jiraEmail, jiraAPIToken);
	const chunks = _.chunk(events, CHUNK_SIZE);

	for (const chunk of chunks) {
		const promises = chunk.map((event) => {
			const putIssueURL = getPutIssueURL({
				jiraCompanyName,
				issueId: event.issueId,
			});
			switch (event.type) {
				case 'UPDATE_POINTS': {
					const fieldName = getFieldName(sourceIssues, event.issueId, 'Story Points');
					const data = {
						fields: {
							[fieldName]: event.points,
							// hardcode this due to duplicate 'Story Points' fields in JIRA for unknown reason
							// customfield_10035: event.points,
						},
					};
					return putIssue(putIssueURL, headers, data);
				}
				case 'ADD_COMMENT': {
					const data = {
						update: {
							comment: [
								{
									add: {
										body: `<p>${event.comment}</p>`,
									},
								},
							],
						},
					};
					return putIssue(putIssueURL, headers, data);
				}
			}
		});

		await Promise.all(promises);

		log.info(`Updated ${promises.length} issues in JIRA for company '${jiraCompanyName}'`);
		// TODO: handle request failure
	}
};
