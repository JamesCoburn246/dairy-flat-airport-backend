'use strict';

/**
 * Required External Modules
 */
import DatabaseHandler from "./database_handler";
// Environment variable handler.
import * as dotenv from "dotenv";
// Networking.
import express, {Express, Request, Response} from "express";
import cors from "cors";
import helmet from "helmet";
// Types.
import {Flight} from "./types";

dotenv.config();

const EXPRESS_PORT: number = parseInt(process.env.EXPRESS_PORT as string, 10) || parseInt(process.env.PORT as string, 10) || 3000;
const DB_HOST: string = process.env.DB_HOST || 'localhost';
const DB_PORT: number = parseInt(process.env.DB_PORT as string, 10) || 3306;
const DB_USER: string = process.env.DB_USER || 'root';
const DB_PASSWORD: string = process.env.DB_PASSWORD || '';
const DB_DATABASE: string = process.env.DB_DATABASE || 'dairy_flats';// TODO_19044568';

/**
 * App Variables
 */

const app: Express = express();
const database_handler: DatabaseHandler = new DatabaseHandler(DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE);


/**
 *  App Configuration
 */

app.use(helmet());
app.use(cors());
app.use(express.json());

/**
 * Server Activation
 */

app.listen(EXPRESS_PORT, () => {
    console.log(`[Express] Listening on port '${EXPRESS_PORT}'.`);
    console.log(`[Database] Using host '${DB_HOST}'.`);
    console.log(`[Database] Using port '${DB_PORT}'.`);
    console.log(`[Database] Using user '${DB_USER}'.`);
    console.log(`[Database] Using schema '${DB_DATABASE}'.`);

});

app.post('/api/ping', (req: Request, res: Response) => {
    res.status(200).send('Pong');
});

interface HttpGetFlightsQueryParams {
    to: string,
    from: string,
    date: string
}

// api/flights?from=YMHB&to=NZNE&date=12-05-2023
app.get('/api/flights', async (req: express.Request<{}, {}, {}, HttpGetFlightsQueryParams>, res: express.Response) => {
    const origin: string = req.query.from;
    const destination: string = req.query.to;
    // A. Get all flights that are leaving from the origin and arriving at the destination.
    // B. If none exist, check for all flights leaving origin, take note of their destinations.
    // C. For each connecting destination, get all flights that are leaving that destination.
    // D. For each flight, check that their departure times allow for a connection, and take note of the destinations that can be reached.
    // E. If no connections arrive at the destination, go to step C.
    console.log('origin1', origin, 'dest1', destination);
    const flightsToFrom = await database_handler.getFlightsFromTo(origin, destination);
    console.log(flightsToFrom);
    if (flightsToFrom.length != 0) {
        res.status(200).send({flights: [flightsToFrom]});
    } else {
        const flights: Array<Flight[]> = await findRoutesBFS(origin, destination, []);
        res.status(200).send({flights: flights});
    }
});


// 1. Get all legs that start with origin.
// 2. Check if any leg has dest as their destination. Return a stack containing leg if it does.
// 3. For each leg, call this function again, with this leg as the origin. If the function returns truthy then add the leg to the stack and return the stack. Else return null.

async function findRoutesBFS(origin: string, dest: string, route: Flight[]): Promise<Array<Flight[]>> {
    // get flights from origin, NOT going to path (no backtrack)
    const flightsLeavingOrigin: Flight[] = await database_handler.getFlightsFromNoBacktrack(origin, route);

    // Check if the route can be completed in 1 flight.
    const routes: Array<Flight[]> = [];
    flightsLeavingOrigin.forEach((flight: Flight) => {
        if (flight.destination == dest)
            routes.concat([route.concat(flight)]);
    });

    // Try to branch out to find available routes.
    for (const flight of flightsLeavingOrigin) {
        if (flight.destination != dest) {
            const result: Array<Flight[]> = await findRoutesBFS(flight.destination, dest, route.concat([flight]));
            if (result != null) {
                routes.concat(result);
            }
        }
    }

    // Return all found routes.
    return routes;
}

// // THIS NEEDS TO BE BFS.
// async function findRoutesDFS(origin, dest): Promise<Array<Flight> | null> {
//     const flightsFrom: Flight[] = await database_handler.getFlightsFrom(origin);
//     for (const flight of flightsFrom) {
//         if (flight.destination == dest) {
//             // We've found the destination, return this flight to the caller to start route construction.
//             return [flight];
//         } else {
//             const result: Array<Flight> = await findRoutesDFS(flight.destination, dest);
//             // The callee has a path, add this flight to the route and return it to the caller.
//             if (result != null) {
//                 return [flight].concat(result);
//             }
//         }
//     }
//     return null;
// }

app.get('*', (req: express.Request, res: express.Response) => {
    res.status(404).send('No API route matched.');
});

app.post('*', (req: express.Request, res: express.Response) => {
    res.status(404).send('No API route matched.');
});

function GetAllServiceInformation() {

}

function MakeBooking(flights: Flight[]) {

}

function GenerateBookingReference() {

}

function GenerateFightNumber() {

}
