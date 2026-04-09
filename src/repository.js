import { Dexie } from "./dexie.mjs";
import { db } from "./src/sw";


export async function addTask(tasks, isBulkInsert) {
    if (!isBulkInsert) {
        await db.tasks.add(tasks[0])
        return
    }
    const tasksToSave = []
    for (const task of tasks) {
        tasksToSave.push(db.tasks.add(task))
    }
    await Promise.all(tasksToSave)
    return

}

/**
 * Salva um processo na tabela task
 * @param {Task} task 
 * @returns 
 */
export async function getTasks() {
    return db.tasks
}

export async function sortTaskByPriority() {
    return await db.tasks
        .where("[rankingPriority+status]")
        .between([Dexie.minKey, "pending"], [Dexie.maxKey, "pending"])
        .reverse()
        .toArray();
}


export async function getWeekLawsuits(){
    return await db.lawsuits.where("deadline").between([Date.now, Date.now() + 7 * 1000 * 60 * 60 * 24]).toArray()

}