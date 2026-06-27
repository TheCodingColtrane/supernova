export type HolidaysAPIResponse = {
    date: string
    name: string
    type: string
}

export type Holidays = {
    name: string
    startDate: Date | string
    endDate: Date | string
    id?: number
    isNational: boolean
}
