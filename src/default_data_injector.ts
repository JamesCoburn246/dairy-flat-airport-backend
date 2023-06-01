'use strict';

// Types.
import MariaDB, {Pool, PoolConnection} from "mariadb";
import {Airport, Booking, Flight, Jet, Route, Service, User} from "./types";
import {SQL_Airport, SQL_Booking, SQL_Flight_Booking, SQL_Flight, SQL_User, SQL_Route, SQL_Service, SQL_Jet} from "./sql_types";

/*
 * A class to handler all direct interactions with our database.
 * Note that we don't need to catch any errors in the exposed functions, as the errors will propagate back to the
 * original callers. The errors should be handled there, instead.
 */
class DataInjector {
    public injectData(db: Pool) {
        const query =
            'SELECT 1;';
        return new Promise((resolve) => {
            db.getConnection()
                .then(async (connection: PoolConnection) => {
                    connection.query(query)
                        .then((results) => {
                            resolve(results);
                        });
                });
        });
    }
}

export default DataInjector;
