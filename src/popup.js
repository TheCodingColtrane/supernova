async function sendMessage(message, data) {
  try {
    console.log("oi")
    const response = await chrome.runtime.sendMessage({ type: message, payload: data });
    // Verifica se houve erro na resposta
    if (response?.success === false) {
      console.error("Erro no SW:", response.error);
      throw new Error(response.error);
    }

    return response;
  } catch (error) {
    // Captura erros de conexão ou serialização
    console.error("Falha ao enviar mensagem para SW:", error);

    // Dica: chrome.runtime.lastError pode ter mais detalhes
    if (chrome.runtime.lastError) {
      console.error("Detalhe do erro:", chrome.runtime.lastError.message);
    }

    throw error;
  }
}

/**
 * Renderiza a tabela
 * @param {string[]} headers Cabeçalhos da tabela
 * @param {*} data  Dados
 */
function renderTable(headers, data) {
  const table = document.createElement("table")
  const thead = table.createTHead()
  for(let header of headers){
    let th = document.createElement("th")
    th.innerHTML = header
    thead.appendChild(th)
  }
  const tbody = table.createTBody()
  const propCount = Object.keys(data[0]).length
  const props = Object.keys(data[0])
  for(let row of data){
    let cell
    let currentRow = tbody.insertRow()
    for(let i = 0; i < propCount; i++) {
      cell = document.createElement("td")
      cell.innerHTML = row[props[i]]
      currentRow.appendChild(cell)
    } 
    tbody.appendChild(currentRow)
  }
  document.body.appendChild(table)
}




document.addEventListener("DOMContentLoaded", async (e) => {
  try {
     
    const statusCount = sendMessage("GET_STATUS_COUNT", {})
    const weekLawsuits = sendMessage("GET_WEEK_LAWSUITS", {})
    const queries = await Promise.all([statusCount, weekLawsuits])
    document.querySelector("#open-status").innerHTML = queries[0].data.Aberto
    document.querySelector("#pending-status").innerHTML = queries[0].data["Aguardando Abertura"]
    console.log("odadas", queries[1].data) 
    renderTable(["Processo", "Assistido(a)", "Prazo", "Status"], queries[1].data)
  } catch (error) {
    console.log(error)
  }

})



document.getElementById("coletar").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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


//Carrega as varas ao abrir o popup no PJE e outros sistemas. 
const loadCircuit = () => {
  const currentPage = window.location.href;
  const foundVaras = []
  if (currentPage === "https://pje.tjmg.jus.br/pje/Painel/painel_usuario/advogado.seam") {
    const expedienteButton = document.getElementById("tabExpedientes_lbl")
    expedienteButton.click()
    const pendingLawsuitsButton = document.getElementById("formAbaExpediente:listaAgrSitExp:0:j_id172")
    pendingLawsuitsButton.click()
    const beloHorizonteButton = document.getElementById("formAbaExpediente:listaAgrSitExp:0:trPend:3::j_id195")
    beloHorizonteButton.click()
    const varas = document.getElementById("formAbaExpediente:listaAgrSitExp:0:trPend:3::j_id195:childs")
    let i = 0
    const varasForms = document.createElement("form")

    const jurisdictions = document.getElementsByClassName("nomeTarefa caixaNomeTarefa")
    let createdVara = new Element(), varaName = new Element(), div = new Element()
    if (jurisdictions) {
      for (let jurisdiction of jurisdictions) {

        createdVara = document.createElement("input[type='checkbox']")
        varaName = document.createElement("label")
        varaName = jurisdiction.innerHTML
        div = document.createElement("div")
        div.appendChild(createdVara, varaName)
        varasForms.appendChild(div)
        document.body.appendChild(varasForms)
      }
    }

  } else if (currentPage.includes("setor_responsavel") || currentPage.includes("situacao")) {

    let lawsuitsTable = document.querySelector("#AbrirPrazosForm").children.item(2)
    if (lawsuitsTable) {
      const tableElements = lawsuitsTable.children.item(1)
      const tableRows = tableElements.rows.length
      for (let i = 0; i < tableRows; i++) {
        console.log(tableElements.rows.item(i))

      }

    }

  }

}

//Gera o arquivo CSV para processamento. 
const generateCSV = (lawsuitInfo) => {
  const headers = Object.keys(lawsuitInfo[0]);
  const rows = lawsuitInfo.map(row => headers.map(field => JSON.stringify(row[field] ?? "")));
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



