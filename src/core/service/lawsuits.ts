import type { Holidays } from "../db/schemas/holidays"
import type { Lawsuits } from "../db/schemas/lawsuits"
import { getHolidaysData } from "../repository/holidays"
import { deleteLawsuitsData, getLawsuitStatusCountData, getPendingLawsuitsData, getWeekLawsuitsData, saveLawsuitsData, updateLawsuitsData } from "../repository/lawsuits"
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
            if (hasHolidays) {
                const currentYear = new Date()
                currentYear.setDate(1)
                currentYear.setMonth(1)
                currentYear.setFullYear((year - 1))
                holidays = await getHolidaysData(currentYear.toISOString().split("T")[0])
            }

            else
                holidays = await getHolidaysData()
        }
        const lawsuits = Array<{ number: string, assisted: string, deadline: string, status: string }>()
        for (const lawsuit of data) {
            let dates = getBusinessDays(new Date(), new Date(lawsuit.deadline), holidays)
            lawsuit.deadline = dates.deadline.toLocaleDateString()
            const businessDaysLeft = dates.days
            lawsuits.push({
                number: lawsuit.number,
                assisted: lawsuit.assisted,
                deadline: lawsuit.deadline + " (" + businessDaysLeft + " dias )",
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

export async function getPendingLawsuits() {
    try {
        const data = await getPendingLawsuitsData()
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

export async function updateLawsuits(lawsuits: Lawsuits[] | Lawsuits) {
    try {
        if (!Array.isArray(lawsuits)) {
            if (lawsuits.id) {
                await updateLawsuitsData(lawsuits)
            }
        } else {
            await updateLawsuitsData(lawsuits)
        }
        return true
    } catch (error) {
        console.log(error)
        return false
    }

}

export async function deleteLawsuits(ids: number[] | number) {
    try {
        await deleteLawsuitsData(ids)
        return true
    } catch (error) {
        console.log(error)
        return false
    }

}
