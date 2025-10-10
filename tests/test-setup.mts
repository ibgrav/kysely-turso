import { createClient } from '@libsql/client'
// // @ts-expect-error the package doesn't provide any types.
import { connect } from '@tursodatabase/database'
import { connect as connectServerless } from '@tursodatabase/serverless'
import { createClient as createCompatClient } from '@tursodatabase/serverless/compat'
import { type Dialect, Kysely, SqliteDialect } from 'kysely'
import LibSQL from 'libsql'
import { LibSQLDialect } from '../libsql'
import { TursoServerlessDialect } from '../serverless'

const URL = 'http://127.0.0.1:8080'

export const SUPPORTED_DIALECTS = [
	'@libsql/client',
	'@tursodatabase/database',
	'@tursodatabase/serverless',
	'@tursodatabase/serverless/compat',
	'libsql',
] as const

export type SupportedDialect = (typeof SUPPORTED_DIALECTS)[number]

const libsql = new LibSQL(':memory:')
const tursodatabase_database = await connect(':memory:')

const DIALECTS = {
	'@libsql/client': new LibSQLDialect({
		client: () => createClient({ url: URL }),
	}),
	'@tursodatabase/database': new SqliteDialect({
		database: tursodatabase_database as never,
	}),
	'@tursodatabase/serverless': new TursoServerlessDialect({
		connection: () =>
			connectServerless({ authToken: '<not_really>', url: URL }),
	}),
	'@tursodatabase/serverless/compat': new LibSQLDialect({
		client: () => createCompatClient({ url: URL }),
	}),
	libsql: new SqliteDialect({
		database: libsql,
	}),
} as const satisfies Record<SupportedDialect, Dialect>

export interface TestContext {
	db: Kysely<Database>
}

export interface Database {
	person: {
		id: string
		name: string
	}
}

export async function initTest(
	dialect: SupportedDialect,
): Promise<TestContext> {
	return { db: new Kysely({ dialect: DIALECTS[dialect] }) }
}

export async function resetState(dialect: SupportedDialect): Promise<void> {
	if (dialect === 'libsql' || dialect === '@tursodatabase/database') {
		await (dialect === 'libsql' ? libsql : tursodatabase_database).exec(`
			drop table if exists person;
			create table person (id varchar primary key, name varchar(255) unique not null);
			insert into person (id, name) values ('48856ed4-9f1f-4111-ba7f-6092a1be96eb', 'moshe'), ('28175ebc-02ec-4c87-9a84-b3d25193fefa', 'haim'), ('cbbffbea-47d5-40ec-a98d-518b48e2bb5d', 'rivka'), ('d2b76f94-1a33-4b8c-9226-7d35390b1112', 'henry');
		`)
		return
	}

	const client = createClient({ url: URL })

	await client.batch(
		[
			`drop table if exists person;`,
			`create table person (id varchar primary key, name varchar(255) unique not null);`,
			`insert into person (id, name) values ('48856ed4-9f1f-4111-ba7f-6092a1be96eb', 'moshe'), ('28175ebc-02ec-4c87-9a84-b3d25193fefa', 'haim'), ('cbbffbea-47d5-40ec-a98d-518b48e2bb5d', 'rivka'), ('d2b76f94-1a33-4b8c-9226-7d35390b1112', 'henry');`,
		],
		'write',
	)

	client.close()
}
