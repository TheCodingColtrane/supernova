import { dbInstance } from "../db/index";
import type { Lawsuits } from "../db/schemas/lawsuits";

const db = dbInstance()

export async function getLawsuitStatusCountData() {
    try {
        const statusCount = { "Aberto": 0, "Aguardando Abertura": 0, "Decurso de Prazo": 0, "Fechado": 0 };
        await db.lawsuits
            .orderBy("status")
            .each(lawsuit => {
                const k = lawsuit.status as keyof typeof statusCount
                statusCount[k] = (statusCount[k] || 0) + 1;
            });
        return statusCount
    } catch (error) {
        console.log(error)
    }
    // if (defenders) await chrome.storage.local.set({ defenders });

}



export async function getWeekLawsuitsData() {
    try {
        const curDate = new Date()
        const day = curDate.getDay()
        const dates = {
            startingDate: "",
            endingDate: ""
        }
        const weekStartDate = curDate
        type WeekLawsuits = {
            number: string;
            assisted: string;
            initialDeadline: string | Date;
            deadline: string | Date;
            status: string;
        }
        if (day > 1) {
            dates.startingDate = new Date(weekStartDate.setDate(curDate.getDate() - day)).toISOString().split("T")[0] ?? ""
            const weekEndDate = new Date(weekStartDate)
            //7 para ir de acordo com o art. 224 CPC
            dates.endingDate = new Date(weekEndDate.setDate(weekStartDate.getDate() + 7)).toISOString().split("T")[0] ?? ""
        } else {
            dates.startingDate = weekStartDate.toISOString().split("T")[0] ?? ""
            dates.endingDate = new Date(weekStartDate.setDate(weekStartDate.getDate() + 7)).toISOString().split("T")[0] ?? ""
        }

        const lawsuits = await db.lawsuits.where(["status", "deadline"]).between(["Aberto", dates.startingDate], ["Aberto", dates.endingDate]).limit(30).toArray()
        const filteredLawsuits = Array<WeekLawsuits>()
        for (const lawsuit of lawsuits) {
            console.log(lawsuit)
            filteredLawsuits.push({
                number: lawsuit.number,
                assisted: lawsuit.assisted,
                initialDeadline: lawsuit.initialDeadline,
                deadline: lawsuit.deadline,
                status: lawsuit.status
            })
        }
        // const filteredLawsuits = lawsuits.map(({ number, assisted, initialDeadline, deadline, status }) => ({ number, assisted, initialDeadline, deadline, status }))
        const sortedLawsuits = [...filteredLawsuits].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        console.log("!dsda", sortedLawsuits)
        return sortedLawsuits

    } catch (error) {
        console.log(error)
    }

}


export async function saveLawsuitsData(lawsuits: Lawsuits[] | Lawsuits) {
    try {
        if (Array.isArray(lawsuits)) {
            await db.lawsuits.bulkAdd(lawsuits);
            return true
        }
        else {
            await db.lawsuits.add(lawsuits);
            return true
        }
    } catch (error) {
        console.log(error)
        return false
    }

}

export async function updateLawsuitsData(lawsuits: Lawsuits[] | Lawsuits) {
    try {
        if (Array.isArray(lawsuits)) {
            await db.lawsuits.bulkPut(lawsuits);
            return true
        }
        else {
            await db.lawsuits.put(lawsuits);
            return true
        }
    } catch (error) {
        console.log(error)
        return false
    }
}



export async function deleteLawsuitsData(ids: number[] | number) {
    try {
        if (Array.isArray(ids)) {
            await db.lawsuits.bulkDelete(ids);
            return true
        }
        else {
            await db.lawsuits.delete(ids);
            return true
        }
    } catch (error) {
        console.log(error)
        return false
    }
}


export async function getPendingLawsuitsData() {
    const today = new Date()
    const endDate = new Date(today.setDate(new Date().getDate() + 90)).toISOString().split("T")[0]
    const lawsuits = await db.lawsuits.where(["status", "deadline"]).between(["Aberto", today], ["Aguardando Abertura", endDate]).toArray()
    console.log("SDADASD", lawsuits)
    return lawsuits

}