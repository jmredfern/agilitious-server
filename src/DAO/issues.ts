'use strict';

import { getKnex } from '../util/database';
import { UUID, IssueEntity } from 'types';

const knex = getKnex();

export const getIssue = async (issueId: string, gameId: UUID): Promise<IssueEntity> => {
	return await knex
		.select('id', 'game_id', 'issue')
		.from('issues')
		.where({
			id: issueId,
			game_id: gameId,
		})
		.first();
};

export const getIssues = async (gameId: UUID): Promise<IssueEntity[]> => {
	return await knex.select('id', 'game_id', 'issue').from('issues').where('game_id', gameId);
};

export const getJiraIssues = async (gameId: UUID): Promise<object[]> => {
	return (await knex.select('jira_issue').from('issues').where('game_id', gameId)).map(
		(issueEntity) => issueEntity.jira_issue,
	);
};

export const updateIssue = async (issueEntity: IssueEntity): Promise<void> => {
	await knex('issues')
		.where({
			id: issueEntity.id,
			game_id: issueEntity.game_id,
		})
		.update({
			issue: issueEntity.issue,
		});
};

export const putIssues = async (issueEntities: IssueEntity[]): Promise<void> => {
	await knex('issues').insert(issueEntities).onConflict(['id', 'game_id']).merge();
};

export const deleteIssue = async (issueId: string, gameId: UUID): Promise<void> => {
	return await knex('issues')
		.where({
			id: issueId,
			game_id: gameId,
		})
		.delete();
};
