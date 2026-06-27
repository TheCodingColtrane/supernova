import { deleteWorker, getWorker, saveWorker, updateWorker } from "../repository/worker"
import type { Worker } from "../types/workers"

export async function saveWorkerData(worker: Worker | Worker[]) {
    try {
        await saveWorker(worker)
        return true
    } catch (error) {
        console.log(error)
        return false

    }

}

export async function updateWorkerData(worker: Worker) {
    try {
        if (!worker.id) return 0
        return await updateWorker(worker)
    } catch (error) {
        console.log(error)
        return 0
    }

}

export async function deleteWorkerData(id: number) {
    try {
        const isDeleted = await deleteWorker(id)
        return isDeleted
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function getWorkerData() {
    try {
        const worker = await getWorker()
        return worker ?? []
    } catch (error) {
        console.log(error)
        return []
    }
}




