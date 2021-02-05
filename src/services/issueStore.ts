'use strict';

import { mapCSVExportToIssues, mapAPIRequestToIssues } from '../util/issues';
import { Issue, UUID } from '../types';

const mappedIssuesStore: { [key: string]: Array<Issue> } = {};
const sourceIssuesStore: { [key: string]: any } = {};

export const storeCSVExportIssues = async (gameId: UUID, issues: string): Promise<void> => {
	const mappedIssues = await mapCSVExportToIssues(issues);
	mappedIssuesStore[gameId] = mappedIssues;
};

export const storeAPIRequestIssues = (gameId: UUID, issues: any): void => {
	const mappedIssues = mapAPIRequestToIssues(issues);
	mappedIssuesStore[gameId] = mappedIssues;
	sourceIssuesStore[gameId] = issues;
};

export const getMappedIssues = (gameId: UUID): Array<Issue> => {
	return mappedIssuesStore[gameId];
};

export const getSourceIssues = (gameId: UUID): any => {
	return sourceIssuesStore[gameId];
};

export const clearIssues = (gameId: UUID): void => {
	delete mappedIssuesStore[gameId];
	delete sourceIssuesStore[gameId];
};
