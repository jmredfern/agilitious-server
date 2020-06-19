'use strict';

import { getIssuesFromCSV } from '../util/csv';
import { Issue } from '../types';

const store: { [key: string]: Array<Issue> } = {};

export const storeCSVIssues = async ({ gameId, issuesCSV }: { gameId: string, issuesCSV: string }): Promise<any> => {
	const issues = await getIssuesFromCSV({ issuesCSV });
	store[gameId] = issues;
};

export const getCSVIssues = ({ gameId }: { gameId: string }): void => {
	// TBD
};

export const getIssues = ({ gameId }: { gameId: string }): Array<Issue> => {
	return store[gameId];
};
