interface Booking {
    reference: string
    flights: Flight[]
}

interface Flight {
    origin: string, // Refers to Airport.icao
    destination: string, // Refers to Airport.icao
    depart: string,
    arrive: string,
    service: number  // Refers to SQL_Service.id
}

interface Airport {
    icao: string,
    name: string,
    country: string,
    timezone: string,
}

interface Service {
    name: string,
    jet: Jet
}

interface Jet {
    name: string,
    capacity: number
}

export {Booking, Flight, Airport, Service, Jet};
