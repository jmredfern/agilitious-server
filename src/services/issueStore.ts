'use strict';

import { getIssuesFromCSV } from '../util/csv';
import { Issue, UUID } from '../types';

const store: { [key: string]: Array<Issue> } = {};

export const storeCSVIssues = async (gameId: UUID, issuesCSV: string): Promise<void> => {
	const issues = await getIssuesFromCSV(issuesCSV);
	store[gameId] = issues;
};

// export const getCSVIssues = (gameId: UUID): void => {
// 	// TBD
// };

export const getIssues = (gameId: UUID): Array<Issue> => {
	return store[gameId];
};

export const clearIssues = (gameId: UUID): void => {
	delete store[gameId];
};
