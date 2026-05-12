import { deleteTask, getTask, saveTask, updateTask } from "../repository/tasks"
import type { Tasks } from "../types/tasks"

export async function saveTaskData(task: Tasks) {
    try {
        const id = await saveTask(task)
        return id ?? 0 
    } catch (error) {
        console.log(error)
        return 0

    }

}

export async function updateTaskData(task: Tasks) {
    try {
        if (!task.id) return 0
        return await updateTask(task)
    } catch (error) {
        console.log(error)
        return 0
    }

}

export async function deleteTaskData(id: number) {
    try {
        const isDeleted = await deleteTask(id)
        return isDeleted
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function getTaskData() {
    try {
        const tasks = await getTask()
        return tasks ?? []
    } catch (error) {
        console.log(error)
        return []
    }
}




