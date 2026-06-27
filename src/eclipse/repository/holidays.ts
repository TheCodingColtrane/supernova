import { dbInstance } from "../db/index";
import type { Holidays } from "../db/schemas/holidays";

const db = dbInstance()
export async function saveHolidaysData(holidays: Holidays[] | Holidays) {
    try {
        if (Array.isArray(holidays)) {
            await db.holidays.bulkAdd(holidays);
            return true
        }
        else await db.holidays.add(holidays);
        return true
    } catch (error) {
        console.log(error)
        return false
    }

}   


export async function getHolidaysData(year?:string) {
    try {
        if (year)
            return await db.holidays.where(["startDate", "endDate"]).between(year, new Date().toISOString().split("T")[0]).toArray()
        else
            return await db.holidays.toArray()

    } catch (error) {
        console.log(error)
        return []
    }

}