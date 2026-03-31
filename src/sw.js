import { Dexie } from "./dexie.mjs"
// import { addTask } from "./repository.js";
export const db = new Dexie("supernova")
db.version(1).stores({
  tasks: `
    ++id,
    title,
    status,
    dueDate,
    businessDaysLeft,
    createdAt,
    updatedAt,

    lawsuitNumber,
    lawsuitParties,
    circuit,
    rankingPriority,

    assignedToEmail,
    assignedRole,
    ttl,
    [lawsuitNumber+status],
    [rankingPriority+status],
    [dueDate+status]
  `,
  lawsuits: `
  ++id, 
  number,
  circuit,
  status,
  assisted, 
  isDefendant,  
  source,
  awarenessDate, 
  deadline, 
  givenDeadline, 
  parties, 
  normalizedParties, 
  searchText, 
  [status+circuit], 
  [status+assisted],
  [circuit+assisted], 
  [status+isDefendant],
  [number+assisted],
  [number+deadline],
  [deadline+number], 
  [assisted+number],
  [assisted+status],
  [assisted+deadline],
  [deadline+assisted],
  [isDefendant+assisted]`
});

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SAVE_LAWSUITS") {
    if (request.payload.isBulkInsert) {
      (async () => {
        try {
          await db.lawsuits.bulkAdd(request.payload.lawsuits);
          const all = await db.lawsuits.toArray();
          sendResponse({ success: true, data: all });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();

      // 3. RETORNO CRUCIAL: Mantém o canal de mensagem aberto
      return true; 
    }
  }
});




async function saveTask(tasks, isBulkInsert) {
  await addTask(tasks, isBulkInsert);
}
/**
 * Cria os defensores cadastrados no solar no localStorage.
 * @returns
 */
async function setDefenders(defenders) {
  if (defenders) await chrome.storage.local.set({ defenders });
  return
}


