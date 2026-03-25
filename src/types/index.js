// let lawsuits = {
//   lawsuit: "",
//   parties: "",
//   Vara: "",
//   "Data de Distribuição": "",
//   "Data de Última Movimentação": "",
//   "Último Movimento": "",
//   CA: new Date(),
//   Prazo: new Date(),
//   "Data Limite": new Date()
// }


export const ROLES = {
  INTERN: 0,
  PUBLIC_EMPLOYEE: 1,
  PUBLIC_DEFENDER: 2
}


export const partyModel = {
  id: 0,
  lawsuitId: 0,
  name: "",
  role: 0       
};

export const employeeModel = {
  id: 0,
  name: "",
  email: "",
  role:  0,
  createdAt: Date.now()
}

// (role = roles) => role[0] === "intern" ? 0 : role[0] === "public_employee" ? 1 : 2 

export const circuitModel = {
   id: 0,
  name: "",
  region: ""
}


export const lawsuitModel = {
  id: 0,
  number: "",          // número do processo
  circuitId: 0,        // FK
  source: "",       // PJE, ESAJ, etc
  deadline: null,      
  lastActivityDate: null,
  lastActivityDesc: "",
  deadlineBusinessDays: 0,
  createdAt: Date.now(),
  updatedAt: Date.now (),

};

export const taskModel = {
  id: 0,
  name: "",
  description: "",
  lawsuitId: 0,   // FK
  employeeId: 0,  // FK
  createdAt: Date.now(),
  updatedAt: Date.now(),
  dueDate: null,
  businessDaysLeft: 0,
  status: "" // pending, done, overdue
};






