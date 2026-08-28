import { sendMessage } from "../utils"


document.addEventListener("DOMContentLoaded", async () => {
  //const userCreds = await getUserCredentials()
  const cards = Array.from(document.querySelectorAll(".status-card"))
  for (const card of cards) {
    //const status =  card.className.split(" ")[1]
    card.addEventListener("click", () => {
      chrome.tabs.create({ url: "./src/pages/gabinete.html" })
    })
  }
})



function renderTableBody(data: Array<{ number: string, assisted: string, deadline: string, status: string }>) {
  const table = document.querySelector("#weekLawsuitTable") as HTMLTableElement
  data.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.number}</td>
                     <td>${c.assisted}</td>
                     <td>${c.deadline}</td>
                     <td>${c.status}</td>`
    table!.appendChild(tr);
  })

}


document.addEventListener("DOMContentLoaded", async () => {
  try {
    const statusCount = sendMessage("GET_STATUS_COUNT", {})
    const weekLawsuits = sendMessage("GET_WEEK_LAWSUITS", {})
    const queries = await Promise.all([statusCount, weekLawsuits])
    console.log("olha as consultasa", queries[1].data)
    if (queries[0]) {
      document.querySelector("#open-status")!.innerHTML = queries[0].data.Aberto
      document.querySelector("#pending-status")!.innerHTML = queries[0].data["Aguardando Abertura"]

    }
    if (queries[1].data)
      renderTableBody(queries[1].data)
  } catch (error) {
    console.log(error)
  }

})



document.getElementById("coletar")?.addEventListener("click", () => {
      chrome.tabs.create({ url: "./src/pages/gabinete.html" })

  });



// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.type === "LAWSUIT_DATA") {
//     console.log("Dados recebidos:", request.payload);
//     generateCSV(request.payload);
//   }
// });



//Gera o arquivo CSV para processamento. 
// const generateCSV = (lawsuitInfo: any) => {
//   const headers = Object.keys(lawsuitInfo[0]);
//   const rows = lawsuitInfo.map((row:any) => headers.map(field => JSON.stringify(row[field] ?? "")));
//   const csvString = "\uFEFF" + [headers.join(","), ...rows].join("\n");
//   const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
//   const link = document.createElement("a");
//   const url = URL.createObjectURL(blob);
//   link.setAttribute("href", url);
//   const date = new Date()
//   const fileName = "processos" + date.getFullYear().toString() + date.getMonth().toString() + date.getDay().toString() + date.getMilliseconds().toString() + "-NV.csv"
//   link.setAttribute("download", fileName);
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
//   lawsuitInfo = []
// };



