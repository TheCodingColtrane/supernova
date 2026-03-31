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
          if(jurisdictions){
            for(let jurisdiction of jurisdictions){

              createdVara = document.createElement("input[type='checkbox']")
              varaName = document.createElement("label")
              varaName =  jurisdiction.innerHTML
              div = document.createElement("div")
              div.appendChild(createdVara, varaName)
              varasForms.appendChild(div)
              document.body.appendChild(varasForms)
            }
          }

    } else if(currentPage.includes("setor_responsavel") || currentPage.includes("situacao")){

        let lawsuitsTable = document.querySelector("#AbrirPrazosForm").children.item(2)
        if(lawsuitsTable){
        const tableElements = lawsuitsTable.children.item(1)
        const tableRows = tableElements.rows.length
        for (let i = 0; i < tableRows; i++) {
            console.log(  tableElements.rows.item(i))
            
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



