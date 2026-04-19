import { getHolidaysAPI } from "../utils"
import { getHolidaysData, saveHolidaysData } from "../repository/holidays"
import type { Holidays } from "../db/schemas/holidays"


// export async function checkHolidays() {
     
//     const data = await chrome.storage.local.get("holidays") as any
//     if (!Object.hasOwn(data, "holidays")) {
//         const data = await getHolidaysData()
//         if (!data) return false
//         else return true
//     } else return true


// }


export async function saveHolidays(holidays: Holidays[], year: number) {
    try {
        if (holidays.length > 1 || holidays.length === 0) {
            if (!holidays) {
                const holidaysResponse = await getHolidaysAPI(year)
                holidays = new Array<Holidays>()
                for (const holiday of holidaysResponse) {
                    holidays.push({
                        startDate: holiday.date,
                        endDate: holiday.date,
                        isNational: holiday.type === "national" ? true : false,
                        name: holiday.name
                    })
                }
            }
            const isCreated = await saveHolidaysData(holidays)
            if (isCreated) return true
        } else {
            const isCreated = await saveHolidaysData(holidays)
            if (isCreated) return true

        }
    } catch (error) {
        console.log(error)
    }

}

export async function getHolidays(year: Date) {
    try {
        year.setDate(0)
        year.setMonth(0)
        const data = await getHolidaysData(year.toISOString().split("T")[0])
        return data
    } catch (error) {
        console.log(error)
    }
}
