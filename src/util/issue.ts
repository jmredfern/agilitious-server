'use strict';

import { Issue, Comment, UUID, IssueEntity } from '../types';

const mapComments = (comments: any): Comment[] =>
	comments.map((comment: any) => ({
		author: comment.author.displayName,
		body: comment.body,
	}));

const mapJiraIssue = (issue: any): Issue => ({
	id: issue.id,
	acceptanceCriteria: issue.namedRenderedFields['Acceptance Criteria'],
	comments: mapComments(issue.renderedFields.comment.comments),
	created: new Date(issue.fields.created).getTime(),
	currentPoints: parseInt(issue.namedFields['Story Points'], 10),
	// hardcode this due to duplicate 'Story Points' fields in JIRA for unknown reason
	// currentPoints: parseInt(issue.fields.customfield_10035, 10),
	description: issue.renderedFields.description,
	epicId: '', // need to make a second loop on the issues to find the uuid for the epic based on epicKey
	epicKey: issue.namedFields['Epic Link'],
	key: issue.key,
	originalPoints: parseInt(issue.namedFields['Story Points'], 10),
	// hardcode this due to duplicate 'Story Points' fields in JIRA for unknown reason
	// originalPoints: parseInt(issue.fields.customfield_10035, 10),
	reporter: issue.fields.reporter.displayName,
	status: issue.fields.status.name,
	title: issue.fields.summary,
	type: issue.fields.issuetype.name,
});

const assignEpicId = (issueEntity: IssueEntity, issuesEntities: Array<IssueEntity>): IssueEntity => {
	if (!issueEntity.issue.epicKey) {
		return issueEntity;
	}
	const epic = issuesEntities.find((i) => i.issue.key === issueEntity.issue.epicKey);
	if (!epic) {
		return issueEntity;
	}
	return {
		...issueEntity,
		issue: {
			...issueEntity.issue,
			epicId: epic.id,
		},
	};
};

export const mapJiraIssuesToIssueEntities = (jiraIssues: object[], gameId: UUID): Array<IssueEntity> => {
	const issueEntities = jiraIssues.map((jiraIssue) => {
		const issue = mapJiraIssue(jiraIssue);
		const id = issue.id;
		return {
			game_id: gameId,
			id,
			issue,
			jira_issue: jiraIssue,
		};
	});
	return issueEntities.map((issueEntity: IssueEntity) => assignEpicId(issueEntity, issueEntities));
};
