export interface SQL_Booking {
    booking_id: string // PRIMARY KEY
    user_id: number // FOREIGN KEY
    total_price: number
}

export interface SQL_User {
    user_id: number // PRIMARY KEY, HIDDEN
    name: string
    email: string
}
export interface SQL_Flight {
    flight_id: number // PRIMARY KEY, HIDDEN
    route_id: string // FOREIGN KEY
    date: string
}

export interface SQL_Route { // READ-ONLY
    route_id: string // PRIMARY KEY
    origin: string // FOREIGN KEY
    destination: string // FOREIGN KEY
    depart: string
    arrive: string
    price: number
    service_id: number // FOREIGN KEY
}

export interface SQL_Airport { // READ-ONLY
    icao: string // PRIMARY KEY, HIDDEN
    name: string
    country: string
    timezone: string
}

export interface SQL_Service { // READ-ONLYv
    service_id: number // PRIMARY KEY, HIDDEN
    name: string
    jet_id: number // FOREIGN KEY
}

export interface SQL_Jet { // READ-ONLY
    jet_id: number // PRIMARY KEY
    name: string
    capacity: number
}
