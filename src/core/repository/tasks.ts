import type { Tasks } from "../types/tasks"
import { dbInstance } from "../db/index";
import type { Lawsuits } from "../types/lawsuits";

const db = dbInstance()
export async function saveTask(task: Tasks) {
    try {
        const id = await db.tasks.add({
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            lawsuitNumber: task.lawsuit?.number ?? "",
            workerId: task.assignedTo.id ?? 0,
            createdAt: new Date(),
            assignedTo: task.assignedTo,
            lawsuit: task.lawsuit!
        })

        return id
    } catch (error) {
        console.log(error)
        return 0
    }


}

export async function updateTask(task: Tasks) {
    try {
        const id = await db.tasks.put({
            id: task.id ?? 0,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            lawsuitNumber: task.lawsuit?.number ?? "",
            workerId: task.assignedTo.id ?? 0,
            assignedTo: task.assignedTo,
            lawsuit: task.lawsuit!,
            updatedAt: new Date()
        })

        return id

    } catch (error) {
        console.log(error)
        return 0
    }

}

export async function deleteTask(id: number) {
    try {
        await db.tasks.delete(id);
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function getTask() {
    try {
        return await db.tasks.toArray()
    } catch (error) {
        console.log(error)
    }
}




