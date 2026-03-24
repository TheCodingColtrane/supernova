import { Dexie } from "./dexie.mjs";

export const db = new Dexie("supernova")
db.version(1).stores({
  circuits: "++id, name, region",
  employees: "++id, email, role",
  lawsuits: "++id, number, circuitId, source, lastActivityDate, deadline",
  parties: "++id, lawsuitId, role, name",
  tasks: "++id, lawsuitId, employeeId, createdAt, updatedAt, businessDaysLeft"
});