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
import {Airport, Booking, Flight, Route, User} from "./types";
import {RunResult} from "better-sqlite3";

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

// Used when fetching available airport nodes.
app.get('/api/airports', async (req: express.Request, res: express.Response) => {
    console.info('GET /api/airports');
    const airports: Airport[] = database_handler.getAllAirports();
    if (airports != undefined) {
        res.status(200).json(airports);
    } else {
        res.status(500).send("Internal Server Error.");
    }
});

// /api/routes?from=YMHB&to=NZNE&date=12-05-2023
// Used when fetching available routes.
app.get('/api/routes', async (req: express.Request<{}, {}, {}, { to: string, from: string, date: string }>, res: express.Response) => {
    console.info('GET /api/routes', req.query, req.body);
    try {
        if (req.query.from === undefined || req.query.to === undefined || req.query.date === undefined) {
            return res.status(400).send("Bad Request.");
        }
        const origin: string = req.query.from;
        const destination: string = req.query.to;
        const dayOfWeek: string = new Date(req.query.date).toLocaleString('en-US', { weekday: 'long' });

        if (origin.length != 4 || destination.length != 4) {
            return res.status(400).send("ICAO values must be 4 characters long.");
        }

        // Try to get direct legs.
        const flightsToFrom: Route[] = database_handler.getRoutesFromTo(origin, destination, dayOfWeek);
        console.log(flightsToFrom)
        // If there are direct legs, return those. Otherwise, find a route to connect.
        if (flightsToFrom.length === 0) {
            const flights: Array<Route[]> = findRoutesBFS(origin, destination, dayOfWeek, []);
            if (flights.length === 0) {
                res.status(404).send("No flights were found matching those filters.");
            } else {
                res.status(200).json(flights);
            }
        } else {
            // TODO EACH ELEMENT OF THIS LIST NEEDS TO BE PUT INTO AN ARRAY OF SIZE ONE.
            res.status(200).json([flightsToFrom]);
        }
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            res.status(500).send(e.message);
        } else {
            res.status(500).send("Internal Server Error.");
        }
    }
});

// /api/booking?id=B1234567
// Used to view a single booking.
app.get('/api/booking', async (req: express.Request<{}, {}, {}, {id: string}>, res: express.Response) => {
    console.info("GET /api/booking", req.query, req.body);
    try {
        if (req.query.id == undefined) {
            return res.status(400).send("Bad Request.");
        }

        const booking: Booking = database_handler.getBooking(req.query.id);

        res.status(200).json(booking);
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            res.status(500).send(e.message);
        } else {
            res.status(500).send("Internal Server Error.");
        }
    }
});

// Used when creating a new booking.
app.post('/api/booking', async (req: express.Request<{}, {}, {flights: Flight[], name: string, email: string}, {}>, res: express.Response) => {
    console.info("POST /api/booking", req.query, req.body);
    try {
        if (req.body.name == undefined || req.body.email == undefined || req.body.flights == undefined) {
            res.status(400).send("Bad Request");
        } // TODO Currently, FLIGHTS refers to ROUTES here.
        const user_details: User = {
            'name': req.body.name,
            'email': req.body.email,
        };
        const booking_reference = generateBookingReference();
        const result: RunResult[] = database_handler.createFlightBookingsForUser(
            booking_reference,
            req.body.flights,
            user_details,
        );

        console.log('booking result ', result);

        // Redirect the frontend to view the newly-created booking.
        res.redirect('http://localhost:3000/bookings/view/' + booking_reference);
        // TODO res.redirect(req.baseUrl + '/bookings/view/' + booking_reference);
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            res.status(500).send(e.message);
        } else {
            res.status(500).send("Internal Server Error");
        }
    }
});

// /api/bookings?email=J.Doe@massey.ac.nz
// Used to view all bookings made by a single user.
app.get('/api/bookings', async (req: express.Request<{}, {}, {}, {email: string}>, res: express.Response) => {
    console.info("GET /api/bookings", req.query, req.body);
    try {
        if (req.query.email == undefined) {
            return res.status(400).send("Bad Request.");
        }

        const user_id: number = database_handler.getUserIdByEmail(req.query.email);
        const bookings: Booking[] = database_handler.getBookingsByUser(user_id);

        res.status(200).json(bookings);
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            res.status(500).send(e.message);
        } else {
            res.status(500).send("Internal Server Error.");
        }
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
function findRoutesBFS(origin: string, dest: string, dayOfWeek: string, route: Route[]): Array<Route[]> {
    // get flights from origin, NOT going to path (no backtrack)
    const flightsLeavingOrigin: Route[] = database_handler.getRoutesFromNoBacktrack(origin, dayOfWeek, route);

    // Check if the route can be completed in 1 flight.
    const routes: Array<Route[]> = [];
    flightsLeavingOrigin.forEach((flight: Route) => {
        if (flight.destination == dest)
            routes.concat([route.concat(flight)]);
    });

    // Try to branch out to find available routes.
    for (const flight of flightsLeavingOrigin) {
        if (flight.destination != dest) {
            const result: Array<Route[]> = findRoutesBFS(flight.destination, dest, dayOfWeek, route.concat([flight]));
            if (result != null) {
                routes.concat(result);
            }
        }
    }

    // Return all found routes.
    return routes;
}

function generateBookingReference(): string {
    // Generate a booking reference.
    const attempt = 'B' + Math.random().toString(36).slice(2, 7).toUpperCase();
    // Check the database to see if it has been used before.
    const result: any = database_handler.doesBookingReferenceExist(attempt);
    // If it has been used before, generate a new one.
    if (result.occurrence_count === 0) {
        return attempt;
    } else {
        return generateBookingReference();
    }
}
