import type { Worker } from "../types/workers"
import { dbInstance } from "../db/index";

const db = dbInstance()
export async function saveWorker(worker: Worker[] | Worker) {
    try {
        if (Array.isArray(worker)) {
            await db.workers.bulkAdd(worker);
            return true
        }
        else {
            await db.workers.add({
                defenderId: worker.defenderId,
                email: worker.email,
                isActive: worker.isActive,
                joinedAt: new Date(),
                name: worker.name,
                role: worker.role,
                endDate: worker.endDate,
                startDate: worker.startDate,
            })
            return true
        }
    } catch (error) {
        console.log(error)
        return false

    }

}
export async function updateWorker(worker: Worker) {
    try {
        const id = await db.workers.put({
            id: worker.id ?? 0,
            defenderId: worker.defenderId,
            email: worker.email,
            isActive: worker.isActive,
            joinedAt: new Date(),
            name: worker.name,
            role: worker.role,
            endDate: worker.endDate,
            startDate: worker.startDate,
        })

        return id

    } catch (error) {
        console.log(error)
        return 0
    }

}

export async function deleteWorker(id: number) {
    try {
        await db.workers.delete(id);
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function getWorker() {
    try {
        return await db.workers.toArray()
    } catch (error) {
        console.log(error)
    }
}




