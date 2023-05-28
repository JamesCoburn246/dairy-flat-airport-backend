interface SQL_Booking {
    booking_id: number
}

interface SQL_Leg {
    leg_id: number, // PRIMARY KEY
    origin: string, // FOREIGN KEY
    destination: string, // FOREIGN KEY
    depart: string,
    arrive: string,
    service_id: number // FOREIGN KEY
}

interface SQL_Airport {
    icao: string, // PRIMARY KEY
    name: string,
    country: string,
    timezone: string,
}

interface SQL_Service {
    service_id: number, // PRIMARY KEY
    name: string,
    jet: number // FOREIGN KEY
}

interface SQL_Jet {
    jet_id: number, // PRIMARY KEY
    name: string,
    capacity: number
}
