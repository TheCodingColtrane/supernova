import { Dexie } from "./dexie.mjs"
// import { getWeekLawsuits } from "./repository.mjs";
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
  (async () => {
    let result
    try {
      switch (request.type) {
        case "SAVE_LAWSUITS":
          result = await saveLawsuits(request.payload.lawsuits, request.payload.isBulkInsert);
          break;
        case "GET_STATUS_COUNT":
          result = await getLawsuitStatusCount();
          break;
        case "GET_WEEK_LAWSUITS":
          result = await getWeekLawsuits()
          break;
      }
      sendResponse({ success: true, data: result });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }

  })()
  return true;


});




async function saveLawsuits(lawsuits, isBulkInsert) {
  try {
    if (isBulkInsert) await db.lawsuits.bulkAdd(lawsuits);
    else await db.lawsuits.add(lawsuits[0]);
    return true
  } catch (error) {
    console.log(error)
    return false
  }

}
/**
 * Cria os defensores cadastrados no solar no localStorage.
 * @returns
 */
async function getLawsuitStatusCount() {
  // if (defenders) await chrome.storage.local.set({ defenders });
  const statusCount = { "Aberto": 0, "Aguardando Abertura": 0, "Decurso de Prazo": 0, "Fechado": 0 };
  await db.lawsuits
    .orderBy("status")
    .each(lawsuit => {
      statusCount[lawsuit.status] = (statusCount[lawsuit.status] || 0) + 1;
    });
  return statusCount
}


async function getWeekLawsuits() {
  try {
    const curDate = new Date()
    const day = curDate.getDay()
    const dates = {
      startingDate: "",
      endingDate: ""
    }
      const weekStartDate = new Date(curDate)

    if (day > 1) {
      dates.startingDate = new Date(weekStartDate.setDate(curDate.getDate()  - day)).toISOString().split("T")[0]
      const weekEndDate = new Date(weekStartDate)
      //7 para ir de acordo com o art. 224 CPC
      dates.endingDate = new Date(weekEndDate.setDate(weekStartDate.getDate() + 7)).toISOString().split("T")[0]
    } else {
      dates.startingDate = weekStartDate.toISOString().split("T")[0]
      dates.endingDate = new Date(weekStartDate.setDate(weekStartDate.getDate() + 7)).toISOString().split("T")[0]
    }
    
    const lawsuits = await db.lawsuits.where("deadline").between(dates.startingDate, dates.endingDate).limit(30).toArray()
    const filteredLawsuits =  lawsuits.map(({ number, assisted, deadline, status }) => ({ number, assisted, deadline, status }))
    const sortedLawsuits = filteredLawsuits.sort((a, b) => new Date(b.deadline) - new Date(a.deadline))
    for (const lawsuit of sortedLawsuits) lawsuit.deadline = new Date(lawsuit.deadline).toLocaleDateString()
    return sortedLawsuits

  } catch (error) {
    console.log(error)
  }

}