import { Dexie } from "./dexie.mjs";

export const db = new Dexie("supernova")
db.version(1).stores({
  circuits: "++id, name, region",
  employees: "++id, email, role",
  lawsuits: "++id, number, circuitId, source, lastActivityDate, deadline",
  parties: "++id, lawsuitId, role, name",
  tasks: "++id, lawsuitId, employeeId, createdAt, updatedAt, businessDaysLeft"
});

/**
 * Retorna os defensores cadastrados no solar no localStorage.
 * @returns 
 */
function getDefenders() {
  const defenders = localStorage.getItem("defenders") 
    if(defenders) return defenders
    else return "" 
}
/**
 * Cria os defensores cadastrados no solar no localStorage.
 * @returns 
 */
function setDefenders(defenders){
  if(defenders) localStorage.setItem("defenders", defenders)
    return
}


