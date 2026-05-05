import type { User } from "../types/user"
import { sendMessage } from "../utils"


document.addEventListener("DOMContentLoaded", async (e) => {
    const userCreds = JSON.parse(localStorage.getItem("user") ?? "") as User
    if(!userCreds){
        chrome.tabs.create({url: "defenders.html?onboard=1"})
    }
    const cards = Array.from(document.querySelectorAll(".status-card"))
    for (const card of cards) {
        const status =  card.className.split(" ")[1]
        card.addEventListener("click", () => {
          chrome.tabs.create({url: "dashboard.html?status="+status})
        })
    }
  })



function renderTable<T>(headers: string[], data: T[]) {
  const table = document.createElement("table");
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  
  for (let header of headers) {
    let th = document.createElement("th");
    th.innerHTML = header;
    headerRow.appendChild(th);
  }

  const tbody = table.createTBody();
  for (let row of data) {
    let currentRow = tbody.insertRow();
    const rowValues = Object.values(row as object); 
    for (let i = 0; i < headers.length; i++) {
      let cell = currentRow.insertCell();
      cell.innerHTML = rowValues[i] !== undefined ? String(rowValues[i]) : "";
    }
  }
  document.body.appendChild(table);
}


function switchPages(fileName: string){
  chrome.tabs.create({
    url: fileName
  })
}


document.addEventListener("DOMContentLoaded", async (e) => {
  try {

    const statusCount = sendMessage("GET_STATUS_COUNT", {})
    const weekLawsuits = sendMessage("GET_WEEK_LAWSUITS", {})
    const queries = await Promise.all([statusCount, weekLawsuits])
    console.log("olha as consultasa", queries[1].data)
    if (queries[0]) {
      document.querySelector("#open-status")!.innerHTML = queries[0].data.Aberto
      document.querySelector("#pending-status")!.innerHTML = queries[0].data["Aguardando Abertura"]

    }
    if(queries[1].data)
    renderTable(["Processo", "Assistido(a)", "Prazo Final", "Status"], queries[1].data)
  } catch (error) {
    console.log(error)
  }

})



document.getElementById("coletar")?.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if(!tabs[0]?.id) return
    chrome.tabs.sendMessage(tabs[0].id, { action: "startExtraction" });
    console.log('Mensagem enviada para content.js');
  });
});



// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.type === "LAWSUIT_DATA") {
//     console.log("Dados recebidos:", request.payload);
//     generateCSV(request.payload);
//   }
// });



//Gera o arquivo CSV para processamento. 
const generateCSV = (lawsuitInfo: any) => {
  const headers = Object.keys(lawsuitInfo[0]);
  const rows = lawsuitInfo.map((row:any) => headers.map(field => JSON.stringify(row[field] ?? "")));
  const csvString = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  const date = new Date()
  const fileName = "processos" + date.getFullYear().toString() + date.getMonth().toString() + date.getDay().toString() + date.getMilliseconds().toString() + "-NV.csv"
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  lawsuitInfo = []
};



