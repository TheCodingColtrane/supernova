import { getNationalHolidaysAPI, getLocalHolidays } from "../utils"
import { deleteHolidaysData, getHolidaysData, saveHolidaysData, updateHolidaysData } from "../repository/holidays"
import type { Holidays } from "../db/schemas/holidays"
import type { HolidaysAPIResponse } from "../types/holidays"



export async function updateHolidays(holidays: Holidays) {
    try {
        const isUpdated = await updateHolidaysData(holidays)
        if (isUpdated) return true

        // }
    } catch (error) {
        console.log(error)
    }

}

export async function deleteHolidays(id: number) {
    try {
        const isDeleted = await deleteHolidaysData(id)
        if (isDeleted) return true

        // }
    } catch (error) {
        console.log(error)
    }

}

export async function saveHolidays(holidays: Holidays[]) {
    try {
    
        const isCreated = await saveHolidaysData(holidays)
        if (isCreated) return isCreated

    } catch (error) {
        console.log(error)
    }

}

export async function getHolidays(year: Date) {
    try {
        if (year) {
            year = new Date(new Date().getFullYear(), 0, 1);
            const data = await getHolidaysData(year.toISOString().split("T")[0])
            return data
        } else {
            const data = await getHolidaysData()
            if (data.length === 0) {
                const previousYear = new Date().getFullYear() - 1
                const nationalHolidays = getNationalHolidaysAPI(previousYear)
                const localHolidays = getLocalHolidays()
                const holidays = await Promise.all([nationalHolidays, localHolidays])
                if (holidays[0]?.length && holidays[1]?.length) {
                    const holidaysSchema = new Array<Holidays>()
                    for (let cHoliday of holidays[0]) {
                        const holiday = cHoliday as HolidaysAPIResponse
                        holidaysSchema.push({
                            startDate: holiday.date,
                            endDate: holiday.name === "Recesso Forense" ?
                            holiday.date.split("-")[0] +"-01-20" : holiday.date,
                            type: "national",
                            name: holiday.name
                        })
                    }

                    await saveHolidays(holidaysSchema)
                    return holidaysSchema

                }
            }
            return data

        }

    } catch (error) {
        console.log(error)
    }
}
