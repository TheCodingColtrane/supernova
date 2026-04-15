import type { Holidays } from "../db/schemas/holidays"
import type { Lawsuits } from "../db/schemas/lawsuits"
import { getHolidaysData } from "../repository/holidays"
import { getLawsuitStatusCountData, getWeekLawsuitsData, saveLawsuitsData } from "../repository/lawsuits"
import { getBusinessDays } from '../utils/date'

type WeekLawsuits = { number: string; assisted: string; initialDeadline: string | Date; deadline: string | Date; status: string }
type WeekLawsuitsBusinessDays = WeekLawsuits & {
    businessDaysLeft: number
}

export async function getWeekLawsuits(considerHoliday = false) {
    try {
        const data = await getWeekLawsuitsData()
        if (!data) return []
        let holidays = Array<Holidays>()
        if (considerHoliday) {
            let year = new Date().getFullYear()
            const hasHolidays = data.some((x: WeekLawsuits) =>
                new Date(x.initialDeadline as string).getFullYear() < year ||
                new Date(x.deadline as string).getFullYear() < year
            );
            if (hasHolidays){
                const currentYear = new Date()
                currentYear.setDate(1)
                currentYear.setMonth(1)
                currentYear.setFullYear((year - 1))
                holidays = await getHolidaysData(currentYear.toISOString().split("T")[0])
            }
            
            else
                holidays = await getHolidaysData()
        }
        const lawsuits: WeekLawsuitsBusinessDays[] = []
        for (const lawsuit of data) {
            let dates = getBusinessDays(new Date(lawsuit.initialDeadline), new Date(lawsuit.deadline), holidays)
            lawsuit.deadline = dates.deadline.toLocaleDateString()
            const businessDaysLeft = dates.businessDays
            lawsuits.push({
                assisted: lawsuit.assisted,
                businessDaysLeft,   
                deadline: lawsuit.deadline,
                initialDeadline: lawsuit.initialDeadline,
                number: lawsuit.number,
                status: lawsuit.status
            })
        }
        console.log("dsasd", lawsuits)
        return lawsuits
    } catch (error) {
        console.log(error)
    }

}

export async function getLawsuitStatusCount() {
    try {
        const data = await getLawsuitStatusCountData()
        return data

    } catch (error) {
        console.log(error)
        return []
    }

}


export async function saveLawsuits(lawsuits: Lawsuits[] | Lawsuits) {
    try {
        await saveLawsuitsData(lawsuits)
        return true
    } catch (error) {
        console.log(error)
        return false
    }

}
