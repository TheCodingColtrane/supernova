import { addBusinessDays } from "date-fns/addBusinessDays"
import { addDays } from "date-fns/addDays"
import { differenceInBusinessDays } from "date-fns/differenceInBusinessDays"
import { differenceInDays } from "date-fns/differenceInDays"
import { formatISO } from "date-fns/formatISO"
import type { Holidays } from "../types/holidays"

export function localDateToIsoDate(date: string, time: boolean) {
    date = date.replaceAll("/", "-")
    if (time && date.includes(":")) {
        const aux = date.substring(0, 10).split("-")
        return aux[2] + "-" + aux[1] + "-" + aux[0] + "T" + date.substring(10)
    }
    const aux = date.split("-")
    return aux[2] + "/" + aux[1] + "/" + aux[0]

}

export function isBusinessDay(date: Date) {
    if (date.getDay() === 6 || date.getDay() === 0)
        return false
    return true
}


export function getNextBusinessDay(date: Date) {
    const day = date.getDay()
    if (!isBusinessDay(date))
        return addDays(date, day === 6 ? 2 : 1)
    else
        return addDays(date, 1)

}



export function getDeadline(startDate: Date, endDate: Date, holidays?: Holidays[], isElapsedDays = false) {
    if (!isElapsedDays) {
        if (!isBusinessDay(startDate))
            startDate = new Date(getNextBusinessDay(startDate))
        if (!isBusinessDay(endDate))
            endDate = new Date(getNextBusinessDay(endDate))
    }

    if (startDate.getTime() > endDate.getTime())
        return { days: 0, deadline: endDate, isDueDate: true }

    let days = !isElapsedDays ? differenceInBusinessDays(endDate, startDate) : differenceInDays(endDate, startDate)
    let datesToIgnore = Array<string>()
    if (holidays?.length) {
        const pendingHolidays = holidays.filter(
            h => new Date(h.startDate).getTime() >=
                new Date(startDate).getTime()
                && new Date(h.endDate).getTime() <=
                new Date(endDate).getTime())
        if (pendingHolidays?.length) {
            const isEndDateHoliday = pendingHolidays.find(c => c.startDate === formatISO(endDate, { representation: 'date' }))
            if (isEndDateHoliday && !isElapsedDays) endDate = new Date(getNextBusinessDay(endDate))
            for (const holiday of pendingHolidays) {
                let days = differenceInDays(new Date(holiday.endDate), new Date(holiday.startDate))
                if (!days) {
                    datesToIgnore.push(holiday.startDate as string)
                    continue
                }
                for (let i = 1; i < days; i++) {
                    let currentDate = addDays(new Date(holiday.startDate), i)
                    datesToIgnore.push(formatISO(currentDate, { representation: 'date' }));
                }

            }
        }


        days += !isElapsedDays ?
            differenceInBusinessDays(addBusinessDays(startDate, datesToIgnore.length), startDate) :
            differenceInDays(addDays(startDate, datesToIgnore.length), startDate)
        endDate = !isElapsedDays ? addBusinessDays(startDate, days) : addDays(startDate, days)

    }



    return { days: days < 0 ? 0 : days, deadline: endDate, isDueDate: false }

}

export function getDeadlineDays(startDate: Date, numDays: number, holidays?: Holidays[], isElapsedDays = false) {
    if (!isElapsedDays) {
        if (!isBusinessDay(startDate))
            startDate = new Date(getNextBusinessDay(startDate))
    }

    let result = new Date()
    if (isElapsedDays) {
        result = addDays(startDate, numDays)
        return result
    }

    if (!holidays?.length) {
        result = addBusinessDays(startDate, numDays)
        return result
    } else {
        if (holidays?.length) {
            const pendingHolidays = holidays.filter(h => new Date(h.startDate + "T03:00:00.000Z") >= startDate)
            if (pendingHolidays?.length) {
                let curDate = startDate
                let offset = 0
                for (const holiday of pendingHolidays) {
                    if (!isBusinessDay(new Date(holiday.endDate + "T03:00:00.000Z")))
                        continue;
                    for (let i = offset; i < numDays; i++) {
                        const isoCurDate = new Date(curDate.toISOString().split("T")[0] + "T03:00:00.000Z")
                        if (isoCurDate >= new Date(holiday.endDate + "T03:00:00.000Z")) {
                            curDate = new Date(getNextBusinessDay(curDate))
                            break;
                        }
                        if (!isBusinessDay(curDate))
                            curDate = new Date(getNextBusinessDay(curDate))
                        else
                            curDate = addBusinessDays(curDate, 1)
                        result = curDate
                        const holidayEndDate = new Date(holiday.endDate + "T03:00:00.000Z")
                        if (result === holidayEndDate) {
                            curDate = new Date(getNextBusinessDay(curDate))
                            break;
                        }
                        offset++


                    }
                    if (offset === numDays) break;
                }

            }

            return result
        } else {
            result = addBusinessDays(startDate, numDays)
            return result
        }

    }


}


export function getTextDay(date: Date) {
    const day = date.getDay()
    switch (day) {
        case 0:
            return "Domingo"
        case 1:
            return "Segunda-feira"
        case 2:
            return "Terça-feira"
        case 3:
            return "Quarta-feira"
        case 4:
            return "Quinta-feira"
        case 5:
            return "Sexta-feira"
        case 6:
            return "Sábado"
        default:
            return "Dia desconhecido"
    }
}
