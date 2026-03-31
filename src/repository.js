import { db } from "./src/background";


/**
 * @typedef {"INTERN" | "PUBLIC EMPLOYEE" | "PUBLIC DEFENDENT"} UserRole
 */

/**
 * @typedef {"pending" | "done" | "overdue"} TaskStatus
 */

/**
 * @typedef {Object} AssignedUser
 * @property {string} name
 * @property {string} email
 * @property {string} createdAt
 * @property {UserRole} role
 */

/**
 * @typedef {Object} Defensory
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} Activity
 * @property {number} id
 * @property {number} type
 * @property {Date} iniitalDate
 * @property {Date} finalDate
 * @property {Defensory} defensory
 * @property {boolean} titular
 * @property {string|null} document
 */

/**
 * @typedef {Object} AssignedDefendent
 * @property {boolean} active
 * @property {string} name
 * @property {string} socialSecurityNumber
 * @property {number} id
 * @property {number} server
 * @property {number} user
 * @property {Activity[]} activities
 */

/**
 * @typedef {Object} Lawsuit
 * @property {string} number
 * @property {string} parties
 * @property {string} circuit
 * @property {Date} dueDate
 * @property {Date} awarenessDueDate
 * @property {string} lastAction
 * @property {Date} lastActionDate
 * @property {number} rankingPriority
 */

/**
 * @typedef {Object} Task
 * @property {string} title
 * @property {string} description
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {Date} dueDate
 * @property {number} businessDaysLeft
 * @property {number} ttl
 * @property {AssignedUser} assignedTo
 * @property {AssignedDefendent} assignedDefendent
 * @property {TaskStatus} status
 * @property {Lawsuit} lawsuit
 */

/**
 * Salva um processo na tabela task
 * @param {Task} tasks tarefas a serem adicionadas
 * @param {boolean} isBulkInsert se for bulkinsert a tarefas serão adicionadas concorrentemente.
 * @returns 
 */
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

/**
 * 
 * @param {Lawsuit} lawsuit 
 */
export async function addLawsuit(lawsuit){

}