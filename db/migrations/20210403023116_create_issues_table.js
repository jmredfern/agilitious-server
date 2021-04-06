const upSQL = `
	CREATE TABLE issues (
		id varchar NOT NULL,
		game_id uuid,
		issue jsonb NOT NULL,
		jira_issue jsonb NOT NULL,
		PRIMARY KEY (id, game_id)
	);
`;

const downSQL = `
	DROP TABLE issues;
`;

exports.up = function (knex) {
	return knex.raw(upSQL);
};

exports.down = function (knex) {
	return knex.raw(downSQL);
};
