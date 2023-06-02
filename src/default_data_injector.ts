'use strict';

// NPM imports.s
import Database, {Statement} from 'better-sqlite3';

/*
 * A class to handler all direct interactions with our database.
 * Note that we don't need to catch any errors in the exposed functions, as the errors will propagate back to the
 * original callers. The errors should be handled there, instead.
 */
class DataInjector {
    public injectData(db: Database.Database) {
        // Check if some data already exists in the database.
        const table_check: Statement = db.prepare(' SELECT COUNT(*) FROM airports; ');
        const table_check_result: any = table_check.get();
        const row_count: number = Object.values(table_check_result)[0] as number;
        if (row_count != 0)
            return;

        const insert_airport: Statement = db.prepare(' INSERT INTO airports (icao, name, country, timezone) VALUES (?, ?, ?, ?); ');
        insert_airport.run('NZCI', 'Tuuta', 'New Zealand', 'GMT+1245');
        insert_airport.run('NZGB', 'Claris', 'New Zealand', 'GMT+1245');
        insert_airport.run('NZNE', 'Dairy Flat', 'New Zealand', 'GMT+1200');
        insert_airport.run('NZRO', 'Rotorua', 'New Zealand', 'GMT+1200');
        insert_airport.run('NZTL', 'Lake Tekapo', 'New Zealand', 'GMT+1200');
        insert_airport.run('YMHB', 'Hobart', 'Australia', 'GMT+1000');

        const insert_jet: Statement = db.prepare(' INSERT INTO jets (jet_id, name, capacity) VALUES (?, ?, ?); ');
        insert_jet.run(1, 'SyberJet SJ30i', 6);
        insert_jet.run(2, 'Cirrus SF50', 4);
        insert_jet.run(3, 'Cirrus SF50', 4);
        insert_jet.run(4, 'HondaJet Elite', 5);
        insert_jet.run(5, 'HondaJet Elite', 5);

        const insert_service: Statement = db.prepare(' INSERT INTO services (name, jet_id) VALUES (?, ?); ');
        insert_service.run('Hobart Prestige Service', 1);
        insert_service.run('Rotorua Service', 2);
        insert_service.run('Great Barrier Island Service', 3);
        insert_service.run('Chatham Islands Service', 4);
        insert_service.run('Lake Tekapo Service', 5);

        const insert_route: Statement = db.prepare(' INSERT INTO routes (route_id, origin, destination, depart, arrive, service_id) VALUES (?, ?, ?, ?, ?, ?); ');
        insert_route.run('HP01', 'NZNE', 'NZRO', 'Friday 0900', 'Friday 1000', 1);
        insert_route.run('HP02', 'NZRO', 'YMHB', 'Friday 1100', 'Friday 1300', 1);
        insert_route.run('HP03', 'YMHB', 'NZNE', 'Sunday 1630', 'Sunday 1900', 1);

    }
}

export default DataInjector;
