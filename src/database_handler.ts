'use strict';

// Built-in imports.
import * as fs from "fs";
import path from "path";

// NPM imports.
import Database, {Statement, Transaction} from 'better-sqlite3';

// Project imports.
import DataInjector from "./default_data_injector";

// Types.
import {Airport, Booking, Flight, Jet, Route, Service, User} from "./types";
import {
    SQL_Airport,
    SQL_Booking,
    SQL_Flight_Booking,
    SQL_Flight,
    SQL_User,
    SQL_Route,
    SQL_Service,
    SQL_Jet
} from "./sql_types";


/*
 * A class to handler all direct interactions with our database.
 * Note that we don't need to catch any errors in the exposed functions, as the errors will propagate back to the
 * original callers. The errors should be handled there, instead.
 */
class DatabaseHandler {
    db: Database.Database;

    constructor(PATH: string, FILE_NAME: string) {
        const directoryPath: string = path.join(__dirname, PATH);
        const filePath: string = path.join(directoryPath, FILE_NAME);

        // Ensure directory exists.
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, {recursive: true});
        }

        // Ensure database file exists.
        fs.writeFileSync(filePath, '');

        // Access database file.
        this.db = new Database(filePath);

        // Test the connection.
        const result = this.db.prepare('SELECT 1; ').get();
        if (result) {
            console.info('[Database] Connected to the database.');
        } else {
            console.error('[Database] Error. Is the SQL server running? Are the details right?');
        }

        // Validate the tables. If they don't exist yet, create them.
        this.validateTables();

        // Inject default data into the database.
        const inj: DataInjector = new DataInjector();
        inj.injectData(this.db);
    }

    private validateTables(): void {
        const create_bookings_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS bookings ( ' +
            '  `booking_id` TEXT PRIMARY KEY, ' +
            '  `user_id` INTEGER NOT NULL ' +
            '); ');
        const create_users_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `users` ( ' +
            '  `user_id` INTEGER PRIMARY KEY, ' +
            '  `name` TEXT NOT NULL, ' +
            '  `email` TEXT NOT NULL UNIQUE ' +
            '); ');
        const create_flights_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `flights` ( ' +
            '  `flight_id` INTEGER PRIMARY KEY, ' +
            '  `route_id` TEXT NOT NULL, ' +
            '  `date` TEXT NOT NULL ' +
            '); ');
        const create_flight_bookings_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `flight_booking_junction` ( ' +
            '  `id` INTEGER PRIMARY KEY, ' +
            '  `booking_id` TEXT NOT NULL, ' +
            '  `flight_id` INTEGER NOT NULL ' +
            '); ');
        const create_routes_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `routes` ( ' +
            '  `route_id` TEXT NOT NULL, ' +
            '  `origin` TEXT NOT NULL, ' +
            '  `destination` TEXT NOT NULL, ' +
            '  `depart` TEXT NOT NULL, ' +
            '  `arrive` TEXT NOT NULL, ' +
            '  `service_id` INTEGER NOT NULL, ' +
            '  PRIMARY KEY (`route_id`) ' +
            ' ); ');
        const create_airports_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `airports` ( ' +
            '  `icao` TEXT PRIMARY KEY, ' +
            '  `name` TEXT NOT NULL UNIQUE, ' +
            '  `country` TEXT NOT NULL, ' +
            '  `timezone` TEXT NOT NULL ' +
            '); ');
        const create_services_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `services` ( ' +
            '  `service_id` INTEGER PRIMARY KEY, ' +
            '  `name` TEXT NOT NULL, ' +
            '  `jet_id` INTEGER NOT NULL ' +
            '); ');
        const create_jets_table_query: Statement = this.db.prepare(
            'CREATE TABLE IF NOT EXISTS `jets` ( ' +
            '  `jet_id` INTEGER PRIMARY KEY, ' +
            '  `name` TEXT NOT NULL, ' +
            '  `capacity` INTEGER NOT NULL ' +
            ' ); ');

        // Create an sqlite transaction.
        const validate_tables: Transaction = this.db.transaction(function() {
            create_bookings_table_query.run();
            create_users_table_query.run();
            create_flights_table_query.run();
            create_flight_bookings_table_query.run();
            create_routes_table_query.run();
            create_airports_table_query.run();
            create_services_table_query.run();
            create_jets_table_query.run();
        });

        // Perform the transaction.
        validate_tables();
    }

    // === Getters ===

    public getBooking(booking_id: string): Booking {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `bookings`' +
            ' WHERE `booking_id` = ?' +
            ' LIMIT 1; ');
        return this.deserializeBooking(query.get(booking_id) as SQL_Booking);
    }

    public getUser(user_id: number): SQL_User {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `users`' +
            ' WHERE `user_id` = ?' +
            ' LIMIT 1; ');
        return query.get(user_id) as SQL_User;
    }

    public getUserIdByEmail(email: string): number {
        // Note that a user's email is a unique field, so no collisions will occur.
        const query: Statement = this.db.prepare(
            ' SELECT `user_id` FROM `users`' +
            ' WHERE `email` = ?' +
            ' LIMIT 1; ');
        const user: SQL_User = query.get(email) as SQL_User;
        return user.user_id;
    }

    private getFlightsForBooking(booking_id: string) {
        const first_query: Statement = this.db.prepare(
            ' SELECT `flight_id` FROM `booked_flights`' +
            ' WHERE `booking_id` = ?; ');
        const ids = first_query.all(booking_id);
        const second_query: Statement = this.db.prepare(
            ' SELECT * FROM `flights`' +
            ' WHERE `flight_id` IN (?); ');
        return this.deserializeFlights(second_query.all(ids) as SQL_Flight[]);
    }

    public getRoute(route_id: string): Route {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `routes`' +
            ' WHERE `route_id` = ?' +
            ' LIMIT 1; ');
        return this.deserializeRoutes(query.all(route_id) as SQL_Route[])[0];
    }

    public getRoutesFrom(origin: string): Route[] {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `routes`' +
            ' WHERE `origin` = ?; ');
        return this.deserializeRoutes(query.all(origin) as SQL_Route[]);
    }

    public getRoutesFromTo(origin: string, dest: string): Route[] {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `routes`' +
            ' WHERE `origin` = ?' +
            ' AND `destination` = ?; ');
        return this.deserializeRoutes(query.all(origin, dest) as SQL_Route[]);
    }

    public getRoutesFromNoBacktrack(origin: string, visited: Route[]): Route[] {
        if (visited.length == 0) {
            return this.getRoutesFrom(origin);
        } else {
            const query: Statement = this.db.prepare(
                ' SELECT * FROM `routes`' +
                ' WHERE `origin` = ?' +
                ' AND `destination` NOT IN (?); ');
            return this.deserializeRoutes(query.all(origin, visited) as SQL_Route[]);
        }
    }

    public getAirport(airport_icao: string): Airport {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `airports`' +
            ' WHERE `icao` = ?' +
            ' LIMIT 1; ');
        return this.deserializeAirport(query.get(airport_icao) as Airport);
    }

    public getAllAirports(): Airport[] {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `airports`; ');
        return this.deserializeAirports(query.all() as SQL_Airport[]);
    }

    public getService(service_id: number): Service {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `services`' +
            ' WHERE `service_id` = ?' +
            ' LIMIT 1; ');
        return this.deserializeService(query.get(service_id) as SQL_Service);
    }

    public getJet(jet_id: number): Jet {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `jets`' +
            ' WHERE `jet_id` = ?' +
            ' LIMIT 1; ');
        return this.deserializeJet(query.get(jet_id) as SQL_Jet);
    }

    // === Setters ===

    public createFlightBookingsForUser(booking_id: string, flight_ids: string[], user: User): void {
        // Create user in db, if not exists.
        this.createUser(user)
        const user_id = this.getUserIdByEmail(user.email);

        // Create booking in db, if not exists.
        this.createBooking(booking_id, user_id);

        // Create flight bookings concurrently in db, if not exists.
        flight_ids.map((flight_id: string) => {
            this.createFlightBooking(booking_id, flight_id);
        });
    }

    private createUser(details: User): void {
        const query: Statement = this.db.prepare('' +
            ' INSERT INTO Users (name, email) ' +
            ' VALUES (?, ?); ');
        query.run(details.name, details.email);
    }

    private createBooking(booking_reference: string, user_id: number): void {
        const query: Statement = this.db.prepare(
            ' ; ');
        query.run(booking_reference, user_id);
    }

    private createFlightBooking(booking_reference: string, flight_id: string): void {

    }

    // === Deserializers, SQL-to-Web ===

    private deserializeBooking(sqlBooking: SQL_Booking): Booking {
        if (sqlBooking == undefined)
            throw new Error("Booking doesn't exist.");
        return {
            'booking_id': sqlBooking.booking_id,
            'customer': this.getUser(sqlBooking.user_id),
            'flights': this.getFlightsForBooking(sqlBooking.booking_id)
        } as Booking;
    }

    private deserializeUser(sqlUser: SQL_User): User {
        if (sqlUser == undefined)
            throw new Error("User doesn't exist.");
        return {
            'email': sqlUser.email,
            'name': sqlUser.name
        } as User;
    }

    private deserializeFlights(sqlFlights: SQL_Flight[]): Flight[] {
        let collation: Flight[] = [];
        sqlFlights.forEach((flight: SQL_Flight) => {
            collation.push({
        if (sqlFlights == undefined)
            throw new Error("No matching flights were found.");
                'flight_id': flight.flight_id,
                'date': flight.date,
                'route': this.getRoute(flight.route_id)
            });
        });
        return collation;
    }

    private deserializeRoutes(sqlRoutes: SQL_Route[]): Route[] {
        if (sqlRoutes == undefined)
            throw new Error("No matching routes were found.");
        let collation: Route[] = [];
        sqlRoutes.forEach((route: SQL_Route) => {
            collation.push({
        if (sqlRoutes == undefined)
            throw new Error("No matching routes were found.");
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

    private deserializeAirports(sqlAirports: SQL_Airport[]): Airport[] {
        if (sqlAirports == undefined)
            throw new Error("No matching airports were found.");
        let collation: Airport[] = [];
        sqlAirports.forEach((airport: SQL_Airport) => {
            collation.push({
                'icao': airport.icao,
                'name': airport.name,
                'country': airport.country,
                'timezone': airport.timezone
            });
        });
        return collation;
    }

    private deserializeAirport(sqlAirport: SQL_Airport): Airport {
        if (sqlAirport == undefined)
            throw new Error("No matching airport was found.");
        return {
            'icao': sqlAirport.icao,
            'name': sqlAirport.name,
            'country': sqlAirport.country,
            'timezone': sqlAirport.timezone
        } as Airport;
    }

    private deserializeService(sqlService: SQL_Service): Service {
        if (sqlService == undefined)
            throw new Error("No matching service was found.");
        return {
            'service_id': sqlService.service_id,
            'name': sqlService.name,
            'jet': this.getJet(sqlService.jet_id)
        } as Service;
    }

    private deserializeJet(sqlJet: SQL_Jet): Jet {
        if (sqlJet == undefined)
            throw new Error("No matching jet was found.");
        return {
            'name': sqlJet.name,
            'capacity': sqlJet.capacity,
        } as Jet;
    }

    // === Serializers, Web-to-SQL ===

    private serializeBooking(booking: Booking): SQL_Booking {
        if (booking == undefined)
            throw new Error("No booking was provided.");
        return {
            booking_id: booking.booking_id,
            user_id: this.getUserIdByEmail(booking.customer.email),
        } as SQL_Booking;
    }
}

export default DatabaseHandler;
