import type { Holidays } from "../types/holidays"

export function localDateToIsoDate(date: string, time: boolean) {
    date = date.replaceAll("/", "-")
    if (time && date.includes(":")) {
        const aux = date.substring(0, 10).split("-")
        return aux[2] + "-" + aux[1] + "-" + aux[0] +"T"+date.substring(10)
    } 
    const aux = date.split("-")
    return aux[2] + "-" + aux[1] + "-" + aux[0]

}

export function isBusinessDay(date: Date){
    if(date.getDay() === 6 || date.getDay() === 5) 
        return false
    return true
}


export function getNextBusinessDay(date: Date) {
    const day = date.getDay()
    if (day === 5 || day === 6)
        return date.setDate(date.getDate() + day === 5 ? 2 : 1)
    else
        return date.setDate(date.getDate() + 1)

}



export function getBusinessDays(startDate: Date, endDate: Date, holidays?: Holidays[]) {
    startDate = new Date(getNextBusinessDay(startDate))
    endDate = new Date(getNextBusinessDay(startDate))
    
    if (holidays) {
        const pendingHolidays = holidays.filter(h => h.startDate >= startDate && h.endDate <= endDate)
        const isEndDateHoliday = pendingHolidays.find(c => c.startDate === endDate)
        if (isEndDateHoliday) endDate = new Date(getNextBusinessDay(endDate))
    }

    let i = 0, businessDays = 0
    while (startDate < endDate) {
        if (holidays) {
            if (startDate === holidays[i]?.startDate) {
                if (holidays[i]?.startDate === holidays[i]?.endDate) {
                    i++
                    continue
                } else {
                    startDate = new Date(getNextBusinessDay(new Date(holidays[i]!.endDate)))
                    i++
                    continue
                }

            }
        }

        startDate = new Date(getNextBusinessDay(startDate))
        businessDays++
    }

    return { businessDays, deadline: startDate }

}