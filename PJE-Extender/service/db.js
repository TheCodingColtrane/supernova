import { db } from "../background";

/** Processos
 * @typedef {Object} Lawsuit
 * @property {number} id
 * @property {string} number
 * @property {number} circuitId
 * @property {string} source
 * @property {string} externalId
 * @property {number|null} deadline
 * @property {number|null} lastActivityDate
 * @property {string} lastActivityDesc
 * @property {number} deadlineBusinessDays
 * @property {number} createdAt
 * @property {number} updatedAt
 */


/** Partes
 * @typedef {Object} Party
 * @property {number} id
 * @property {number} lawsuitId
 * @property {string} name
 * @property {number} role
 */

/** Vara
 * @typedef {Object} Circuit
 * @property {number} id
 * @property {string} name
 * @property {number} regiomn
 */

/** Empregado
 * @typedef {Object} Employee
 * @property {number} id
 * @property {string} name
 * @property {string} Email
 * @property {number} role
 * @property {number} createdAt
 */

/**
 * Tarefa
 * @typedef {Object} Task
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {number} lawsuitId
 * @property {number} employeeId
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number} dueDate
 * @property {number} businessDaysLeft
 * @property {string} status
 */


/**
 * Salva um processo na tabela lawsuits
 * @param {Lawsuit} lawsuit 
 * @returns 
 */
async function addLawsuit(lawsuit) {
    return await db.lawsuits.add(lawsuit)
}

/**
 * Salva um processo na tabela employee
 * @param {Employee} employee 
 * @returns 
 */
async function addEmployee(employee) {
    return await db.employees.add(employee)

}

/**
 * Salva um processo na tabela party
 * @param {Party} party 
 * @returns 
 */
async function addParties(party) {
    return await db.parties.add(party)
}


/**
 * Salva um processo na tabela circuit
 * @param {Circuit} circuit 
 * @returns 
 */
async function addCircuits(circuit) {
    return await db.circuits.add(circuit)
}

/**
 * Salva um processo na tabela circuit
 * @param {Task} task
 * @returns 
 */
async function addTasks(task) {
    return await db.tasks.add(task)
}


/**
 * Salva um processo na tabela lawsuits
 * @param {string | null} lawsuitNumber 
 * @returns 
 */
async function getLawsuits(lawsuitNumber) {
    if (lawsuitNumber) {
        const tasks = await db.tasks
            .where("lawsuitId")
            .equals(lawsuitId)
            .toArray();

        return tasks
    }
    return await db.lawsuits.toArray();
}