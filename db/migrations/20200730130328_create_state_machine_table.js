const upSQL = `
	CREATE TYPE phase AS ENUM ('START', 'PLAYING', 'FINISHED', 'PERSISTED');

	CREATE TABLE fsm_state (
		id uuid PRIMARY KEY,
		json jsonb NOT NULL,
		phase phase NOT NULL,
		created_date timestamp NOT NULL,
		updated_date timestamp NOT NULL
	);
`;

const downSQL = `
	DROP TABLE fsm_state;

	DROP TYPE phase;
`;

exports.up = function(knex) {
	return knex.raw(upSQL);
};

exports.down = function(knex) {
	return knex.raw(downSQL);
};
