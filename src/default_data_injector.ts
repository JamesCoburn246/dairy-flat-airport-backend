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

        /*
         * NOTE: I just decided to set the prices equal to the amount of miles travelled.
         *       For duplicate routes, I just increased the price by 1 to show that each
         *       flight has different prices.
         */
        const insert_route: Statement = db.prepare(' INSERT INTO routes (route_id, origin, destination, depart, arrive, price, service_id) VALUES (?, ?, ?, ?, ?, ?, ?); ');
        // Hobart Prestige Service.
        insert_route.run('HBP01', 'NZNE', 'NZRO', 'Friday 0900', 'Friday 1000', '136', 1);
        insert_route.run('HBP02', 'NZRO', 'YMHB', 'Friday 1100', 'Friday 1300', '1545', 1);
        insert_route.run('HBP03', 'YMHB', 'NZNE', 'Sunday 1630', 'Sunday 1900', '1500', 1);
        // Rotorua Service (Monday).
        insert_route.run('RUAM1', 'NZNE', 'NZRO', 'Monday 0745', 'Monday 0835', '136', 2);
        insert_route.run('RUAM2', 'NZRO', 'NZNE', 'Monday 1115', 'Monday 1205', '137', 2);
        insert_route.run('RUAM3', 'NZNE', 'NZRO', 'Monday 1345', 'Monday 1435', '138', 2);
        insert_route.run('RUAM4', 'NZRO', 'NZNE', 'Monday 1715', 'Monday 1805', '139', 2);
        // Rotorua Service (Tuesday).
        insert_route.run('RUAT1', 'NZNE', 'NZRO', 'Tuesday 0745', 'Tuesday 0835', '136', 2);
        insert_route.run('RUAT2', 'NZRO', 'NZNE', 'Tuesday 1115', 'Tuesday 1205', '137', 2);
        insert_route.run('RUAT3', 'NZNE', 'NZRO', 'Tuesday 1345', 'Tuesday 1435', '138', 2);
        insert_route.run('RUAT4', 'NZRO', 'NZNE', 'Tuesday 1715', 'Tuesday 1805', '139', 2);
        // Rotorua Service (Wednesday).
        insert_route.run('RUAW1', 'NZNE', 'NZRO', 'Wednesday 0745', 'Wednesday 0835', '136', 2);
        insert_route.run('RUAW2', 'NZRO', 'NZNE', 'Wednesday 1115', 'Wednesday 1205', '137', 2);
        insert_route.run('RUAW3', 'NZNE', 'NZRO', 'Wednesday 1345', 'Wednesday 1435', '138', 2);
        insert_route.run('RUAW4', 'NZRO', 'NZNE', 'Wednesday 1715', 'Wednesday 1805', '139', 2);
        // Rotorua Service (Thursday).
        insert_route.run('RUAH1', 'NZNE', 'NZRO', 'Thursday 0745', 'Thursday 0835', '136', 2);
        insert_route.run('RUAH2', 'NZRO', 'NZNE', 'Thursday 1115', 'Thursday 1205', '137', 2);
        insert_route.run('RUAH3', 'NZNE', 'NZRO', 'Thursday 1345', 'Thursday 1435', '138', 2);
        insert_route.run('RUAH4', 'NZRO', 'NZNE', 'Thursday 1715', 'Thursday 1805', '139', 2);
        // Rotorua Service (Friday).
        insert_route.run('RUAF1', 'NZNE', 'NZRO', 'Friday 0745', 'Friday 0835', '136', 2);
        insert_route.run('RUAF2', 'NZRO', 'NZNE', 'Friday 1115', 'Friday 1205', '137', 2);
        insert_route.run('RUAF3', 'NZNE', 'NZRO', 'Friday 1345', 'Friday 1435', '138', 2);
        insert_route.run('RUAF4', 'NZRO', 'NZNE', 'Friday 1715', 'Friday 1805', '139', 2);
        // Great Barrier Island Service.
        insert_route.run('GBRI1', 'NZNE', 'NZGB', 'Monday 0930', 'Monday 1020', '54', 3);
        insert_route.run('GBRI2', 'NZGB', 'NZNE', 'Tuesday 0915', 'Tuesday 1005', '55', 3);
        insert_route.run('GBRI3', 'NZNE', 'NZGB', 'Wednesday 0930', 'Wednesday 1020', '56', 3);
        insert_route.run('GBRI4', 'NZGB', 'NZNE', 'Thursday 0915', 'Thursday 1005', '57', 3);
        insert_route.run('GBRI5', 'NZNE', 'NZGB', 'Friday 0930', 'Friday 1020', '58', 3);
        insert_route.run('GBRI6', 'NZGB', 'NZNE', 'Saturday 0915', 'Saturday 1005', '59', 3);
        // Chatham Islands Service.
        insert_route.run('CTMI1', 'NZNE' , 'NZCI', 'Tuesday 1130', 'Tuesday 1330', '681', 4);
        insert_route.run('CTMI2', 'NZCI' , 'NZNE', 'Wednesday 0700', 'Wednesday 0900', '682', 4);
        insert_route.run('CTMI3', 'NZNE' , 'NZCI', 'Friday 0910', 'Friday 1110', '683', 4);
        insert_route.run('CTMI4', 'NZCI' , 'NZNE', 'Saturday 1445', 'Saturday 1645', '684', 4);
        // Lake Tekapo Service.
        insert_route.run('LKTP1', 'NZNE', 'NZTL', 'Monday 1540', 'Monday 1700', '553', 5);
        insert_route.run('LKTP2', 'NZTL', 'NZNE', 'Tuesday 1420', 'Tuesday 1540', '554', 5);
    }
}

export default DataInjector;
