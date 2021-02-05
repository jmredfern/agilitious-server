'use strict';

import fs from 'fs';
import { mapCSVExportToIssues } from '../../../src/util/issues';
import { Issue } from '../../../src/types';

describe('util/csv/getIssuesFromCSV', () => {
	let result: Array<Issue>;
	let testIssuesCSV: string;

	beforeEach(async () => {
		testIssuesCSV = fs.readFileSync('__tests__/data/testIssues.csv').toString();
		result = await mapCSVExportToIssues(testIssuesCSV);
	});
	it('should convert CSV to JS Object and return', () => {
		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					acceptanceCriteria: '',
					created: 1594056120000,
					currentPoints: 3,
					// description:
					// 	'Uploading an NOA document to a new RF program in EPManager fails.\nEven after the NOA fails to upload, the program is still created and marked as ready.',
					epicId: '',
					epicKey: '',
					// id: '4514b3c0-86ad-4423-adf7-fbc15d4274fe',
					key: 'EN-418',
					originalPoints: 3,
					reporter: 'lnu',
					status: 'TO DO',
					title: '[EPManager] Program is created without NOA and NOA is not read',
					type: 'Bug',
				}),
				expect.objectContaining({
					acceptanceCriteria: '',
					created: 1591029180000,
					currentPoints: 2,
					// description:
					// 'The Admin API call to create users creates users successfully. The user list in the enrollment object continues to contain unique users.\nThe EPManager API call to create users creates duplicate users. The user list in the enrollment  object gets duplicate users.·\n1. Create an RF enrollment and add a user.\n2. Save the enrollment as a draft\n3. Go back to the enrollment and add the same user.\n4. Save the enrollment again.\n5. Inspect the user list in the "onboarding" object and note that there are duplicate users.',
					epicId: '',
					epicKey: '',
					// id: '9d465b6b-1382-477e-8577-fe65839da73a',
					key: 'EN-362',
					originalPoints: 2,
					reporter: 'lnu',
					status: 'TO DO',
					title: 'Duplicate Users Can be created with two different API calls',
					type: 'Bug',
				}),
			]),
		);
	});
});
