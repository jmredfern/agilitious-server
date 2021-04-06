'use strict';

import { mapJiraIssuesToIssueEntities } from '../util/issue';
import { Issue, UUID } from '../types';
import * as issuesDAO from '../DAO/issues';

export const putJIRAIssues = async (gameId: UUID, issues: any[]): Promise<void> => {
	const issueEntities = mapJiraIssuesToIssueEntities(issues, gameId);
	await issuesDAO.putIssues(issueEntities);
};

export const putIssue = async (gameId: UUID, issue: Issue): Promise<void> => {
	await issuesDAO.updateIssue({
		game_id: gameId,
		id: issue.id,
		issue,
	});
};

export const getIssue = async (issueId: string, gameId: UUID): Promise<Issue> => {
	const issueEntity = await issuesDAO.getIssue(issueId, gameId);
	return issueEntity.issue;
};

export const getIssues = async (gameId: UUID): Promise<Issue[]> => {
	const issueEntities = await issuesDAO.getIssues(gameId);
	return issueEntities.map((issueEntity) => issueEntity.issue);
};
