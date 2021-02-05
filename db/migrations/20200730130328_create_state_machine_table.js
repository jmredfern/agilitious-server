const upSQL = `
	CREATE TYPE phase AS ENUM ('START', 'PLAYING', 'GAME_OVER', 'FINISHED', 'PERSISTED');

	CREATE TABLE games (
		id uuid PRIMARY KEY,
		fsm_state jsonb NOT NULL,
		phase phase NOT NULL,
		created_date timestamp NOT NULL,
		updated_date timestamp NOT NULL
	);
`;

const downSQL = `
	DROP TABLE games;
	DROP TYPE phase;
`;

exports.up = function (knex) {
	return knex.raw(upSQL);
};

exports.down = function (knex) {
	return knex.raw(downSQL);
};
