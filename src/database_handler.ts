'use strict';

// Types.
import MariaDB, {Pool, PoolConnection} from "mariadb";
import {Airport, Booking, Flight, Jet, Route, Service, User} from "./types";
import {SQL_Airport, SQL_Booking, SQL_Flight_Booking, SQL_Flight, SQL_User, SQL_Route, SQL_Service, SQL_Jet} from "./sql_types";
import DataInjector from "./default_data_injector";

/*
 * A class to handler all direct interactions with our database.
 * Note that we don't need to catch any errors in the exposed functions, as the errors will propagate back to the
 * original callers. The errors should be handled there, instead.
 */
class DatabaseHandler {
    db: Pool;
    database: string;

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

        // Validate the tables. If they don't exist yet, create them.
        this.validateTables().catch((error) => {
            console.error(`[Database] Encountered an error while validating and initializing database!\n${error}`);
        });

        // Inject default data into the database.
        const inj: DataInjector = new DataInjector();
        inj.injectData(this.db);
    }

    private async validateTables(): Promise<void> {
        this.db.getConnection()
            .then(async (connection: PoolConnection) => {
                const create_database_query =
                    'CREATE DATABASE IF NOT EXISTS `' + this.database + '`; ';
                const use_database_query =
                    'USE `' + this.database + '`; ';
                const create_bookings_table_query =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`bookings` ( ' +
                    '  `booking_id` char(8) NOT NULL, ' +
                    '  `user_id` int(11) NOT NULL, ' +
                    '  PRIMARY KEY (`booking_id`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_users_table_query =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`users` ( ' +
                    '  `user_id` int(11) NOT NULL AUTO_INCREMENT, ' +
                    '  `name` varchar(32) NOT NULL, ' +
                    '  `email` varchar(320) NOT NULL, ' +
                    '  PRIMARY KEY (`user_id`), ' +
                    '  UNIQUE KEY `email` (`email`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_flights_table_query =
                    'CREATE TABLE IF NOT EXISTS `flights` ( ' +
                    '  `flight_id` int(11) NOT NULL, ' +
                    '  `route_id` int(11) NOT NULL, ' +
                    '  `date` varchar(32) NOT NULL, ' +
                    '  PRIMARY KEY (`flight_id`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_flight_bookings_table_query =
                    'CREATE TABLE IF NOT EXISTS `bookings` ( ' +
                    '  `booking_id` char(6) NOT NULL, ' + // TODO
                    '  `user_id` int(11) NOT NULL, ' +
                    '  PRIMARY KEY (`booking_id`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci';
                const create_routes_table_query  =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`routes` ( ' +
                    '  `route_id` char(8) NOT NULL AUTO_INCREMENT, ' +
                    '  `origin` char(4) NOT NULL, ' +
                    '  `destination` char(4) NOT NULL, ' +
                    '  `depart` varchar(16) NOT NULL, ' +
                    '  `arrive` varchar(16) NOT NULL, ' +
                    '  `service_id` int(11) NOT NULL, ' +
                    '  PRIMARY KEY (`route_id`) ' +
                    ' ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_airports_table_query =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`airports` ( ' +
                    '  `icao` char(4) NOT NULL, ' +
                    '  `name` varchar(32) NOT NULL, ' +
                    '  `country` varchar(32) NOT NULL, ' +
                    '  `timezone` text NOT NULL, ' +
                    '  PRIMARY KEY (`icao`), ' +
                    '  UNIQUE KEY `name` (`name`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_services_table_query=
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`services` ( ' +
                    '  `service_id` int(11) NOT NULL AUTO_INCREMENT, ' +
                    '  `name` varchar(64) NOT NULL, ' +
                    '  `jet_id` smallint(6) NOT NULL, ' +
                    '  PRIMARY KEY (`service_id`) ' +
                    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                const create_jets_table_query =
                    'CREATE TABLE IF NOT EXISTS ' + this.database + '.`jets` ( ' +
                    '  `jet_id` smallint(6) NOT NULL AUTO_INCREMENT, ' +
                    '  `name` varchar(32) NOT NULL, ' +
                    '  `capacity` smallint(6) NOT NULL, ' +
                    '  PRIMARY KEY (`jet_id`) ' +
                    ' ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci; ';
                try {
                    await connection.query(create_database_query)
                    await connection.query(use_database_query)
                    await connection.query(create_bookings_table_query)
                    await connection.query(create_users_table_query)
                    await connection.query(create_flights_table_query)
                    await connection.query(create_flight_bookings_table_query)
                    await connection.query(create_routes_table_query)
                    await connection.query(create_airports_table_query)
                    await connection.query(create_services_table_query)
                    await connection.query(create_jets_table_query)
                    console.log('[Database] Tables validated successfully.');
                } catch (e) {
                    console.error('[Database] Failed to generate tables.');
                    console.error(e);
                } finally {
                    connection.release().then();
                }
            });
    }

    // === Getters ===

    private async select(query: string): Promise<any> {
        return new Promise((resolve) => {
            this.db.getConnection()
                .then(async (connection: PoolConnection) => {
                    connection.query(query)
                        .then((results) => {
                            resolve(results);
                        })
                        .finally(() => {
                            connection.release().then();
                        });
                });
        });
    }

    private async selectWith(query: string, values: any[]): Promise<any> {
        return new Promise((resolve) => {
            this.db.getConnection()
                .then(async (connection: PoolConnection) => {
                    connection.query(query, values)
                        .then((results) => {
                            resolve(results);
                        })
                        .finally(() => {
                            connection.release().then();
                        });
                });
        });
    }

    public async getBooking(booking_id: string) {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`bookings`' +
            ' WHERE `booking_id` = ?' +
            ' LIMIT 1; ';
        return this.deserializeBooking(await this.selectWith(query, [booking_id]));
    }

    public async getUser(user_id: number) {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`users`' +
            ' WHERE `user_id` = ?' +
            ' LIMIT 1; ';
        return this.deserializeUser(await this.selectWith(query, [user_id]));
    }

    public async getUserIdByEmail(email: string): Promise<number> {
        // Note that a user's email is a unique field, so no collisions will occur.
        const query: string =
            ' SELECT `user_id` FROM ' + this.database + '.`users`' +
            ' WHERE `email` = ?' +
            ' LIMIT 1; ';
        const user: SQL_User = await this.selectWith(query, [email]);
        return user.user_id;
    }

    private async getFlightsForBooking(booking_id: string) {
        const first_query: string =
            ' SELECT `flight_id` FROM ' + this.database + '.`booked_flights`' +
            ' WHERE `booking_id` = ?; ';
        const ids = await this.selectWith(first_query, [booking_id]);
        const second_query: string =
            ' SELECT * FROM ' + this.database + '.`flights`' +
            ' WHERE `flight_id` IN (?); ';
        return this.deserializeFlights(await this.selectWith(second_query, ids));
    }

    public async getRoute(route_id: string): Promise<Route> {
        const query =
            ' SELECT * FROM ' + this.database + '.`routes`' +
            ' WHERE `route_id` = ?' +
            ' LIMIT 1; ';
        return this.deserializeRoutes(await this.selectWith(query, [route_id]))[0];
    }

    public async getRoutesFrom(origin: string): Promise<Route[]> {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`routes`' +
            ' WHERE `origin` = ?; ';
        return this.deserializeRoutes(await this.selectWith(query, [origin]));
    }

    public async getRoutesFromTo(origin: string, dest: string): Promise<Route[]> {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`routes`' +
            ' WHERE `origin` = ?' +
            ' AND `destination` = ?; ';
        return this.deserializeRoutes(await this.selectWith(query, [origin, dest]));
    }

    public async getRoutesFromNoBacktrack(origin: string, visited: Route[]): Promise<Route[]> {
        if (visited.length == 0) {
            return this.getRoutesFrom(origin);
        } else {
            const query: string =
                ' SELECT * FROM ' + this.database + '.`routes`' +
                ' WHERE `origin` = ?' +
                ' AND `destination` NOT IN (?); ';
            return this.deserializeRoutes(await this.selectWith(query, [origin, visited]));
        }
    }

    public async getAirport(airport_icao: string): Promise<Airport> {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`airports`' +
            ' WHERE `icao` = ?' +
            ' LIMIT 1; ';
        return this.deserializeAirport(await this.selectWith(query, [airport_icao]));
    }

    public async getAllAirports(): Promise<Airport[]> {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`airports`; ';
        const result = await this.select(query)
        return this.deserializeAirports(result);
    }

    public async getService(service_id: number): Promise<Service> {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`services`' +
            ' WHERE `service_id` = ?' +
            ' LIMIT 1; ';
        return this.deserializeService(await this.selectWith(query, [service_id]));
    }

    public async getJet(jet_id: number): Promise<Jet> {
        const query: string =
            ' SELECT * FROM ' + this.database + '.`jets`' +
            ' WHERE `jet_id` = ?' +
            ' LIMIT 1; ';
        return this.deserializeJet(await this.selectWith(query, [jet_id]));
    }

    // === Deserializers, SQL-to-Web ===

    private async deserializeBooking(results: SQL_Booking): Promise<Booking> {
        return {
            'booking_id': results.booking_id,
            'customer': await this.getUser(results.user_id),
            'flights': await this.getFlightsForBooking(results.booking_id)
        }
    }

    private deserializeUser(results: SQL_User): User {
        return {
            'email': results.email,
            'name': results.name
        }
    }

    private async deserializeFlights(results: SQL_Flight[]): Promise<Flight[]> {
        let collation: Flight[] = [];
        for (const flight of results) {
            collation.push({
                'flight_id': flight.flight_id,
                'date': flight.date,
                'route': await this.getRoute(flight.route_id)
            });
        }
        return collation;
    }

    private deserializeRoutes(results: SQL_Route[]): Route[] {
        let collation: Route[] = [];
        results.forEach((route: SQL_Route) => {
            collation.push({
                'route_id': route.route_id,
                'origin': route.origin,
                'destination': route.destination,
                'depart': route.depart,
                'arrive': route.arrive,
                'service': route.service_id
            });
        });
        return collation;
    }

    private deserializeAirports(results: SQL_Airport[]): Airport[] {
        let collation: Airport[] = [];
        results.forEach((airport: SQL_Airport) => {
            collation.push({
                'icao': airport.icao,
                'name': airport.name,
                'country': airport.country,
                'timezone': airport.timezone
            });
        });
        return collation;
    }

    private deserializeAirport(results: SQL_Airport): Airport {
        return {
            'icao': results.icao,
            'name': results.name,
            'country': results.country,
            'timezone': results.timezone
        };
    }

    private async deserializeService(results: SQL_Service): Promise<Service> {
        return {
            'service_id': results.service_id,
            'name': results.name,
            'jet': await this.getJet(results.jet_id)
        };
    }

    private deserializeJet(results: SQL_Jet): Jet {
        return {
            'name': results.name,
            'capacity': results.capacity,
        };
    }

    // === Setters ===

    public async bookFlightsForUser(booking_id: string, flights: string[], user: User): Promise<void> {
        // Create user in db, if not exists.
        await this.createUser(user)
        const user_id = await this.getUserIdByEmail(user.email);

        // Create booking in db, if not exists.
        await this.createBooking(booking_id, user_id);

        // Create flight bookings concurrently in db, if not exists.
        await Promise.all(flights.map((flight) => {
            this.createFlightBooking(booking_id, flight);
        }));
    }

    private async createUser(details: User): Promise<void> {

    }

    private async createBooking(booking_reference: string, user_id: number): Promise<void> {

    }

    private async createFlightBooking(booking_reference: string, flight_id: string) {

    }

    // === Serializers, Web-to-SQL ===

    private async serializeBooking(booking: Booking): Promise<SQL_Booking> {
        return {
            booking_id: booking.booking_id,
            user_id: await this.getUserIdByEmail(booking.customer.email),
        }
    }
}

export default DatabaseHandler;
