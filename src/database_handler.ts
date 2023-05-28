'use strict';

// Types.
import Flight from "./types";
import MariaDB, {Pool, PoolConnection} from "mariadb";

/*
 * A class to handler all direct interactions with our database.
 * Note that we don't need to catch any errors in the exposed functions, as the errors will propagate back to the
 * original callers. The errors should be handled there, instead.
 */
class DatabaseHandler {
    db: Pool;
    database: string;
    cached_community_total: number;
    cache_valid: boolean;

    constructor(DB_HOST: string, DB_PORT: number, DB_USER: string, DB_PASSWORD: string, DB_DATABASE: string) {
        this.db = MariaDB.createPool({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            debug: false,
            trace: true
        });
        this.database = DB_DATABASE;

        // Test the connection.
        this.db.getConnection()
            .then((connection: PoolConnection) => {
                connection.query('SELECT 1;')
                    .then(() => {
                        console.info('[Database] Connected to the database.');
                    })
                    .catch((reason) => {
                        console.error('[Database] Error. Is the SQL server running? Are the details right?');
                        console.error('[Database] Error message:\n\n', reason);
                    })
                    .finally(() => {
                        connection.release().then();
                    });
            })
            .catch((reason) => {
                console.error('[Database] Could not acquire a connection. Are the settings correct?')
                console.error(reason);
            });

        // Validate the schemas. If they don't exist yet, create them.
        this.validateTables().catch((error) => {
            console.error(`[Database] Encountered an error while validating and initializing database!\n${error}`);
        });


        // Initialize cache objects.
        this.cached_community_total = 0;
        this.cache_valid = false;
    }

    private async validateTables(): Promise<void> {
        this.db.getConnection()
            .then(async (connection: PoolConnection) => {
                const create_database_query =
                    'CREATE DATABASE IF NOT EXISTS `' + this.database + '`; ';
                const use_database_query =
                    'USE `' + this.database + '`; ';
                const create_airports_table_query =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`airports` ( ' +
                    '  `icao` char(4) NOT NULL, ' +
                    '  `name` varchar(32) NOT NULL, ' +
                    '  `country` varchar(32) NOT NULL, ' +
                    '  `timezone` text NOT NULL, ' +
                    '  PRIMARY KEY (`icao`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_bookings_table_query = '';
                const create_jets_table_query =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`jets` ( ' +
                    '  `jet_id` smallint(6) NOT NULL AUTO_INCREMENT, ' +
                    '  `name` varchar(32) NOT NULL, ' +
                    '  `capacity` smallint(6) NOT NULL, ' +
                    '  PRIMARY KEY (`jet_id`) ' +
                    ' ) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_legs_table_query  =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`legs` ( ' +
                    '  `leg_id` int(11) NOT NULL AUTO_INCREMENT, ' +
                    '  `origin` char(4) NOT NULL, ' +
                    '  `destination` char(4) NOT NULL, ' +
                    '  `depart` varchar(16) NOT NULL, ' +
                    '  `arrive` varchar(16) NOT NULL, ' +
                    '  `service_id` int(11) NOT NULL, ' +
                    '  PRIMARY KEY (`leg_id`) ' +
                    ' ) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_services_table_query=
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`services` ( ' +
                    '  `service_id` int(11) NOT NULL AUTO_INCREMENT, ' +
                    '  `name` varchar(64) NOT NULL, ' +
                    '  `jet_id` smallint(6) NOT NULL, ' +
                    '  PRIMARY KEY (`id`) ' +
                    ') ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                try {
                    await connection.query(create_database_query)
                    await connection.query(use_database_query)
                    await connection.query(create_airports_table_query)
                    await connection.query(create_jets_table_query)
                    await connection.query(create_legs_table_query)
                    await connection.query(create_services_table_query)
                    console.log('[Database] Tables validated successfully.');
                } catch (e) {
                    console.error('[Database] Failed to generate tables.');
                } finally {
                    connection.release().then();
                }
            });
    }

    private deserializeFlight(results: Array<any>): Flight[] {
        let collation: Flight[] = [];
        results.forEach((item: LegSQL) => {
            collation.push({
                    'origin': item.origin,
                    'destination': item.destination,
                    'depart': item.depart,
                    'arrive': item.arrive,
                    'service': item.service_id
                });
        });
        return collation;
    }

    public async getFlightsFromTo(origin: string, dest: string): Promise<Array<Flight>> {
        return new Promise((resolve) => {
            this.db.getConnection()
                .then(async (connection: PoolConnection) => {
                    const query: string =
                        ' SELECT * FROM ' + this.database + '.`legs`' +
                        ' WHERE `origin` = ?' +
                        ' AND `destination` = ?; ';
                    connection.query(query, [origin, dest])
                        .then((results) => {
                            console.log('[Database] Tables validated successfully.');
                            resolve(this.deserializeFlight(results));
                        })
                        .finally(() => {
                            connection.release().then();
                        });
                });
        });
    }

    public async getFlightsFrom(origin: string): Promise<Array<Flight>> {
        return new Promise((resolve) => {
            this.db.getConnection()
                .then(async (connection: PoolConnection) => {
                    const query: string =
                        ' SELECT * FROM ' + this.database + '.`legs` WHERE `origin` = ?; ';
                    connection.query(query, [origin])
                        .then((results) => {
                            console.log('[Database] Tables validated successfully.');
                            console.log('getFlightsFrom origin', origin, 'results', results);
                            resolve(results);
                        })
                        .finally(() => {
                            connection.release().then();
                        });
                });
        });
    }

    public async getFlightsNoBacktrack(origin: string, visited: Flight[]): Promise<Flight[]> {
        if (visited.length == 0) {
            return this.getFlightsFrom(origin);
        }
        return new Promise((resolve) => {
            this.db.getConnection()
                .then(async (connection: PoolConnection) => {
                    const query: string =
                        ' SELECT * FROM ' + this.database + '.`legs`' +
                        ' WHERE `origin` = ?' +
                        ' AND `destination` NOT IN (?); ';
                    connection.query(query, [origin, visited])
                        .then((results) => {
                            console.log('[Database] Tables validated successfully.');
                            resolve(this.deserializeFlight(results));
                        })
                        .finally(() => {
                            connection.release().then();
                        });
                });
        });
    }
}

export default DatabaseHandler;
