const upSQL = `
	CREATE TYPE state AS ENUM ('START', 'PLAYING', 'FINISHED');

	CREATE TABLE fsm_state (
		id uuid PRIMARY KEY,
		json jsonb NOT NULL,
		current_state state NOT NULL,
		created_date timestamp NOT NULL,
		updated_date timestamp NOT NULL
	);
`;

const downSQL = `
	DROP TABLE fsm_state;

	DROP TYPE state;
`;

exports.up = function(knex) {
	return knex.raw(upSQL);
};

exports.down = function(knex) {
	return knex.raw(downSQL);
};
