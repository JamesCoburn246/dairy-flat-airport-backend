'use strict';

/*
 * James Coburn
 * 19044568 2023
 * Semester 1
 */

// Built-in imports.
import * as fs from "fs";
import path from "path";

// Database driver (NPM import).
import Database, {RunResult, Statement, Transaction} from 'better-sqlite3';

// Project imports.
import DataInjector from "./default_data_injector";

// Types.
import {Airport, Booking, Flight, Jet, Route, Service, User} from "./types";
import {SQL_Airport, SQL_Booking, SQL_Flight, SQL_Jet, SQL_Route, SQL_Service, SQL_User} from "./sql_types";


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
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
        }

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
            'CREATE TABLE IF NOT EXISTS `bookings`' +
            ' ( ' +
            '  `booking_id` TEXT PRIMARY KEY, ' +
            '  `user_id` INTEGER NOT NULL, ' +
            '  `total_price` INTEGER NOT NULL ' +
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
            '  `price` NUMBER NOT NULL, ' +
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

    public async getBooking(booking_id: string): Promise<Booking> {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `bookings`' +
            ' WHERE `booking_id` = ?' +
            ' LIMIT 1; ');
        return this.deserializeBooking(query.get(booking_id) as SQL_Booking);
    }

    public getBookingsByUser(user_id: number): Booking[] {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `bookings`' +
            ' WHERE `user_id` = ?; ');
        return this.deserializeBookings(query.all(user_id) as SQL_Booking[]);
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
        if (user === undefined)
            throw new Error("Provided email doesn't match any users.");
        return user.user_id;
    }

    private getFlightsForBooking(booking_id: string): Flight[] {
        const first_query: Statement = this.db.prepare(
            ' SELECT `flight_id` FROM `flight_booking_junction`' +
            ' WHERE `booking_id` = ?; ');
        const result: any[] = first_query.all(booking_id);
        const flight_ids: number[] = result.map((item) => item.flight_id);
        const second_query: Statement = this.db.prepare(
            ' SELECT * FROM `flights`' +
            ' WHERE `flight_id` IN (@values); ');
        return this.deserializeFlights(second_query.all({ values: flight_ids.join(',') }) as SQL_Flight[]);
    }

    private getFlightId(route_id: string, date: string): number {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `flights`' +
            ' WHERE `route_id` = ? ' +
            ' AND `date` = ?' +
            ' LIMIT 1; '
        );
        return (query.get(route_id, date) as any).flight_id;
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

    public getRoutesFromTo(origin: string, dest: string, day: string): Route[] {
        const query: Statement = this.db.prepare(
            ' SELECT * FROM `routes`' +
            ' WHERE `origin` = ?' +
            ' AND `destination` = ?' +
            ' AND `depart` LIKE ?; ');
        return this.deserializeRoutes(query.all(origin, dest, (day + "%")) as SQL_Route[]);
    }

    public getRoutesFromNoBacktrack(origin: string, day: string, visited: Route[]): Route[] {
        if (visited.length == 0) {
            return this.getRoutesFrom(origin);
        } else {
            const query: Statement = this.db.prepare(
                ' SELECT * FROM `routes`' +
                ' WHERE `origin` = ?' +
                ' AND `destination` NOT IN (?)' +
                ' AND `depart` LIKE ?; ');
            return this.deserializeRoutes(query.all(origin, visited, (day + "%")) as SQL_Route[]);
        }
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

    public doesBookingReferenceExist(booking_reference: string): unknown {
        const query: Statement = this.db.prepare(
            ' SELECT `booking_id`, COUNT(*) AS occurrence_count ' +
            ' FROM `bookings` ' +
            ' WHERE `booking_id` = ?; ');
        const result: any = query.get(booking_reference);
        return result.occurrence_count;
    }

    // === Setters ===

    public createFlightBookingsForUser(booking_id: string, flights: Flight[], user: User): RunResult[] {
        // Create user in db, if not exists.
        this.createUserIfNew(user)
        const user_id: number = this.getUserIdByEmail(user.email);

        flights.forEach((flight: Flight) => {
            if (!this.hasFlightGotRoom(flight)) {
                throw new Error("There are no seats left on this flight!");
            }
        });

        // Create booking in db, if not exists.
        const total_price: number = this.sumFlightCosts(flights);
        this.createBooking(booking_id, user_id, total_price);

        // Create flight bookings concurrently in db, if not exists.
        return flights.map((flight: Flight) => {
            this.createFlight(flight);
            // Fetch the flight information from the database in order to get the flight's flight_id.
            return this.createFlightBooking(booking_id, this.getFlightId(flight.route.route_id, flight.date));
        });
    }

    private createUserIfNew(details: User): RunResult {
        const query: Statement = this.db.prepare(
            ' INSERT OR IGNORE INTO `Users` (name, email) VALUES (?, ?); '
        );
        return query.run(details.name, details.email);
    }

    private createBooking(booking_reference: string, user_id: number, total_price: number): RunResult {
        const query: Statement = this.db.prepare(
            ' INSERT INTO `Bookings` (booking_id, user_id) VALUES (?, ?, ?); '
        );
        return query.run(booking_reference, user_id, total_price);
    }

    public deleteBooking(booking_reference: string, user_id: number): RunResult {
        const query: Statement = this.db.prepare(
            ' DELETE FROM Bookings ' +
            ' WHERE `booking_id` = ? ' +
            ' AND `user_id` = ?; '
        );
        return query.run(booking_reference, user_id);
    }

    private createFlight(flight: Flight) : RunResult {
        const query: Statement = this.db.prepare(
            ' INSERT INTO Flights (route_id, date) VALUES (?, ?); '
        );
        return query.run(flight.route.route_id, flight.date);
    }

    private createFlightBooking(booking_reference: string, flight_id: number): RunResult {
        const query: Statement = this.db.prepare(
            ' INSERT INTO flight_booking_junction (booking_id, flight_id) VALUES (?, ?); '
        );
        return query.run(booking_reference, flight_id);
    }

    // === Deserializers, SQL-to-Web ===

    private deserializeBooking(sqlBooking: SQL_Booking): Booking {
        if (sqlBooking == undefined)
            throw new Error("Booking doesn't exist.");
        const flights: Flight[] = this.getFlightsForBooking(sqlBooking.booking_id);
        return {
            'booking_id': sqlBooking.booking_id,
            'customer': this.getUser(sqlBooking.user_id),
            'flights': flights,
            'total_price': this.sumFlightCosts(flights)
        } as Booking;
    }

    private deserializeBookings(sqlBooking: SQL_Booking[]): Booking[] {
        if (sqlBooking == undefined)
            throw new Error("Booking doesn't exist.");
        return sqlBooking.map((booking: SQL_Booking) => {
            return {
                'booking_id': booking.booking_id,
                'customer': this.getUser(booking.user_id),
                'flights': this.getFlightsForBooking(booking.booking_id),
                'total_price': booking.total_price
            };
        });
    }
    private deserializeFlights(sqlFlights: SQL_Flight[]): Flight[] {
        if (sqlFlights == undefined)
            throw new Error("No matching flights were found.");
        return sqlFlights.map((flight: SQL_Flight) => {
            return {
                'flight_id': flight.flight_id,
                'date': flight.date,
                'route': this.getRoute(flight.route_id)
            };
        });
    }

    private deserializeRoutes(sqlRoutes: SQL_Route[]): Route[] {
        if (sqlRoutes == undefined)
            throw new Error("No matching routes were found.");
        return sqlRoutes.map((route: SQL_Route) => {
            return {
                'route_id': route.route_id,
                'origin': route.origin,
                'destination': route.destination,
                'depart': route.depart,
                'arrive': route.arrive,
                'price': route.price,
                'service': this.getService(route.service_id)
            };
        });
    }

    private deserializeAirports(sqlAirports: SQL_Airport[]): Airport[] {
        if (sqlAirports == undefined)
            throw new Error("No matching airports were found.");
        return sqlAirports.map((airport: SQL_Airport) => this.deserializeAirport(airport));
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

    // === Misc. ===

    private sumFlightCosts(flights: Flight[]): number {
        return flights
            .map((flight: Flight) => flight.route.price)
            .reduce((currentValue: number, price: number) => currentValue + price, 0);
    }

    private hasFlightGotRoom(flight: Flight) {
        const capacity: number = flight.route.service.jet.capacity;
        const query: Statement = this.db.prepare(' SELECT COUNT(*) as booked_seats ' +
            ' FROM `flight_booking_junction` ' +
            ' WHERE `flight_id` = ?; ');
        const result: any = query.get(flight.flight_id);
        return capacity > result.booked_seats;
    }
}

export default DatabaseHandler;
