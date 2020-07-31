module.exports = {
	development: {
		client: 'postgresql',
		connection: {
			database: 'agilicious',
			host: '127.0.0.1',
			password: 'password',
			user: 'agilicious',
		},
		migrations: {
			directory: __dirname + '/db/migrations',
		},
		seeds: {
			directory: __dirname + '/db/seeds',
		},
	},

	production: {
		client: 'postgresql',
		connection: process.env.DATABASE_URL,
		pool: {
			min: 2,
			max: 10,
		},
		migrations: {
			directory: __dirname + '/db/migrations',
		},
		seeds: {
			directory: __dirname + '/db/seeds',
		},
	},
};
