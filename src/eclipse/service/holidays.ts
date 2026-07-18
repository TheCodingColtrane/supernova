import { getNationalHolidaysAPI, getLocalHolidays } from "../utils"
import { getHolidaysData, saveHolidaysData } from "../repository/holidays"
import type { Holidays } from "../db/schemas/holidays"
import type { HolidaysAPIResponse } from "../types/holidays"


// export async function checkHolidays() {

//     const data = await chrome.storage.local.get("holidays") as any
//     if (!Object.hasOwn(data, "holidays")) {
//         const data = await getHolidaysData()
//         if (!data) return false
//         else return true
//     } else return true


// }


export async function saveHolidays(holidays: Holidays[]) {
    try {
        // if (holidays.length > 1 || holidays.length === 0) {
        //     if (!holidays) {
        //         const holidaysResponse = await getHolidaysAPI(year)
        //         holidays = new Array<Holidays>()
        //         for (const holiday of holidaysResponse as Holidays[]) {
        //             holidays.push({
        //                 startDate: holiday.startDate,
        //                 endDate: holiday.endDate,
        //                 isNational: holiday.isNational,
        //                 name: holiday.name
        //             })
        //         }
        //     }
        //     const isCreated = await saveHolidaysData(holidays)
        //     if (isCreated) return true
        // } else {
        const isCreated = await saveHolidaysData(holidays)
        if (isCreated) return true

        // }
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
                            endDate: holiday.date,
                            type: "national",
                            name: holiday.name
                        })
                    }

                    //   for (const holiday of holidays[1]) {
                    //     holidaysSchema.push({
                    //         startDate: holiday.data,
                    //         endDate: holiday.data,
                    //         type: holiday.tipo === "MUNICIPAL"  ? "city" : "state",
                    //         name: holiday.nome
                    //     })
                    // }


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
