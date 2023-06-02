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
import {Airport, Booking, Route, User} from "./types";

dotenv.config();

const EXPRESS_PORT: number = parseInt(process.env.EXPRESS_PORT as string, 10) || parseInt(process.env.PORT as string, 10) || 4000;

/**
 * App Variables
 */

const app: Express = express();
const database_handler: DatabaseHandler = new DatabaseHandler('/database', 'dairy_flats.sqlite3');


/**s
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
});

app.post('/api/ping', (req: Request, res: Response) => {
    res.status(200).send('Pong');
});

interface HttpGetFlightsQueryParams {
    to: string,
    from: string,
    date: string
}

app.get('/api/airports', async (req: express.Request, res: express.Response) => {
    console.log('GET /api/airports');
    const airports: Airport[] = database_handler.getAllAirports();
    console.log(airports);
    if (airports != undefined) {
        res.status(200).json(airports);
    } else {
        res.status(500).send("An error has occurred");
    }
});

// api/routes?from=YMHB&to=NZNE&date=12-05-2023
app.get('/api/flights', async (req: express.Request<{}, {}, {}, HttpGetFlightsQueryParams>, res: express.Response) => {
    console.log('GET /api/flights', req.query);
    const origin: string = req.query.from;
    const destination: string = req.query.to;
    if (origin.length != 4 || destination.length !=4) {
        return res.status(400).send("ICAO values must be 4 characters long.");
    }
    // Try to get direct legs.
    const flightsToFrom: Route[] = database_handler.getRoutesFromTo(origin, destination);
    console.log(flightsToFrom)
    // If there are direct legs, return those. Otherwise, find a route to connect.
    if (flightsToFrom.length === 0) {
        const flights: Array<Route[]> = findRoutesBFS(origin, destination, []);
        res.status(200).json(flights);
    } else {
        // TODO EACH ELEMENT OF THIS LIST NEEDS TO BE PUT INTO AN ARRAY OF SIZE ONE.
        res.status(200).json([flightsToFrom]);
    }
});

// api/booking?id=B1234567
// Used to view a booking.
app.get('/api/booking', async (req: express.Request<{}, {}, {}, {id: string}>, res: express.Response) => {
    const booking_reference: string = req.query.id;
    console.log("GET /api/booking?id=" + booking_reference);

    const booking: Booking = database_handler.getBooking(booking_reference);

    res.status(200).json(booking);
});

// Used when creating a new booking.
app.post('/api/booking', async (req: express.Request<{}, {}, {}, {flights: string[], email?: string, name?: string}>, res: express.Response) => {
    console.log("POST /api/booking)");

    if (req.query.email == undefined || req.query.name == undefined) {
        res.redirect(300, '/bookings/create/');
    } else {
        const booking_reference = generateBookingReference();
        const user_details: User = {
            'name': req.query.name,
            'email': req.query.email,
        };

        database_handler.createFlightBookingsForUser(
            booking_reference,
            req.query.flights,
            user_details,
        );

        // Redirect the frontend to view the newly-created booking.
        res.redirect(300, '/bookings/view/' + booking_reference);
    }


});

app.get('*', (req: express.Request, res: express.Response) => {
    res.status(404).send('No API route matched.');
});

app.post('*', (req: express.Request, res: express.Response) => {
    res.status(404).send('No API route matched.');
});

// 1. Get all legs that start with origin.
// 2. Check if any leg has dest as their destination. Return a stack containing leg if it does.
// 3. For each leg, call this function again, with this leg as the origin. If the function returns truthy then add the leg to the stack and return the stack. Else return null.
function findRoutesBFS(origin: string, dest: string, route: Route[]): Array<Route[]> {
    // get flights from origin, NOT going to path (no backtrack)
    const flightsLeavingOrigin: Route[] = database_handler.getRoutesFromNoBacktrack(origin, route);

    // Check if the route can be completed in 1 flight.
    const routes: Array<Route[]> = [];
    flightsLeavingOrigin.forEach((flight: Route) => {
        if (flight.destination == dest)
            routes.concat([route.concat(flight)]);
    });

    // Try to branch out to find available routes.
    for (const flight of flightsLeavingOrigin) {
        if (flight.destination != dest) {
            const result: Array<Route[]> = findRoutesBFS(flight.destination, dest, route.concat([flight]));
            if (result != null) {
                routes.concat(result);
            }
        }
    }

    // Return all found routes.
    return routes;
}

function generateBookingReference(): string {
    return 'B' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

console.log(generateBookingReference());
