export interface Booking {
    booking_id: string
    customer: User
    flights: Flight[]
}

export interface User {
    name: string
    email: string
}

export interface Flight {
    flight_id: number | undefined
    route: Route
    date: string // Only refers to the calendar date - departure/arrival is in Route.
}

export interface Route {
    route_id: string
    origin: string // Refers to Airport.icao
    destination: string // Refers to Airport.icao
    depart: string
    arrive: string
    service: Service
}

export interface Airport {
    icao: string
    name: string
    country: string
    timezone: string
}

export interface Service {
    service_id: number
    name: string
    jet: Jet
}

export interface Jet {
    name: string
    capacity: number
}
