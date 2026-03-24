const currentPage = document.location.href
let system = ""

let lawsuitInfo = [{
  "Nº do Processo": "",
  Partes: "",
  Vara: "",
  "Data de Distribuição": "",
  "Data de Última Movimentação": "",
  "Último Movimento": "",
  CA: new Date(),
  Prazo: new Date(),
  "Data Limite": new Date()
}]


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startExtraction") {
    if (system > -1 || system < 3) scrapeData();
    else {
      alert("Há suporte somente ao sistema SOLAR e o PJE. Favor entrar em contato com o desenvolvedor.")
      return
    }
  }
});



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "loadCircuit") {
    loadCircuit();
  }
});

const getPJELawsuits = () => {

  let table = document.getElementById('formAcervo:tbProcessos')
  let rowLength = table.rows.length;
  for (i = 0; i < rowLength; i++) {
    var oCells = table.rows.item(i).cells;
    var cellLength = oCells.length;
    for (var j = 0; j < cellLength; j++) {
      if (j >= 2) {
        let cellVal = oCells.item(j)
        if (cellVal.tagName !== 'TH') {
          if (cellVal.className === 'rich-table-cell informacoesProcesso') {
            console.log("Olha o processo", cellVal.children.item(0).children.item(0))
            const lawsuitNumber = cellVal.children.item(0).children.item(0).children.item(0).innerText.split(" ")[1]
            const classxa = cellVal.children.item(0).children.item(0).children.item(0).innerText
            const parts = cellVal.children.item(0).children.item(1).children.item(0).innerText
            const vara = cellVal.children.item(0).children.item(1).children.item(1).innerText
            const distribDate = cellVal.children.item(0).children.item(1).children.item(2).innerText
            const lastAction = cellVal.children.item(0).children.item(1).children.item(3).innerText
            if (!lawsuitInfo[0]["Nº do Processo"]) {
              lawsuitInfo[0]["Nº do Processo"] = lawsuitNumber
              lawsuitInfo[0].Partes = parts
              lawsuitInfo[0].Vara = vara
              lawsuitInfo[0]["Data de Distribuição"] = distribDate
              lawsuitInfo[0]["Data de Última Movimentação"] = lastAction.substring(18, 33)
              lawsuitInfo[0]["Último Movimento"] = lastAction.substring(36)
            } else
              lawsuitInfo.push({
                "Nº do Processo": lawsuitNumber,
                Partes: parts,
                Vara: vara,
                "Data de Distribuição": distribDate,
                "Data de Última Movimentação": lastAction.substring(18, 33),
                "Último Movimento": lastAction.substring(36)
              })

          }


        }

      }
    }
  }
  nextPage()
  return lawsuitInfo
}


function nextPage() {
  let tablePendingLawsuits = document.getElementById('formAcervo:tbProcessos:scPendentes_table')
  if (!tablePendingLawsuits) {
    chrome.runtime.sendMessage({ type: "LAWSUIT_DATA", payload: lawsuitInfo });
    return
  }
  let forwardButton = tablePendingLawsuits.rows.item(0).cells.item(11)

  if (forwardButton.className === ' rich-datascr-button') {
    forwardButton.click()

    const interval = setInterval(() => {
      const isLoaded = document.getElementById('_viewRoot:status.start')
      if (isLoaded && isLoaded.style.display === 'none') {
        clearInterval(interval)
        getPJELawsuits()
      }
    }, 1000)

  } else {
    chrome.runtime.sendMessage({ type: "LAWSUIT_DATA", payload: lawsuitInfo });
    return lawsuitInfo

  }


}






function parseDate(dateString = "") {
  let date = dateString.split("/")
  if (dateString.includes(":"))
    return new Date(date[2] + "-" + date[1] + "-" + date[0] + " T" + date[3])
  else return new Date(date[2] + "-" + date[1] + "-" + date[0])
}




/**
 * Faz a pesquisa no sistema da defensoria para extrair páginas HTML com os processos em lotes.
 * @param {{count: 0, status: 0}} pagesData quantidade de páginas, com o respectivo status de cada lista de processos
 * @param {number} system Solar v1 ou v2
 * @param {number} circuit Vara ou defensoria
 * @returns 
 */
async function batchFetch(pagesData, system, circuit) {
  const allResults = []

  // transforma pagesData em uma lista de URLs
  const urls = []

  for (const page of pagesData) {
    for (let i = system === 2 ? 1 : 0; i <= page.count; i++) {
      let solarURL = ""

      if (system === 2) {
        solarURL = `https://solar.defensoria.mg.def.br/processo/intimacao/buscar/?situacao=${page.status}&tipo=INT&setor_responsavel=${circuit}&page=${i}`
      } else {
        solarURL = `https://solar.defensoria.mg.def.br/v2/buscar-processos-judiciais?situacao=${page.status}&page_size=100&page=${i}`
      }

      urls.push(solarURL)
    }
  }

  // lotes de 3. (ISSO É FEITO PARA EVITAR TOO MANY REQUESTS. NÃO DEFINIR VALOR SUPERIOR A 10.)
  const BATCH_SIZE = 3

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)

    const promises = batch.map(async (url) => {
      try {
        const response = await fetch(url)

        if (!response.ok) {
          return {
            rawHTML: "",
            statusCode: response.status
          }
        }

        return {
          rawHTML: await response.text(),
          statusCode: 200
        }

      } catch (error) {
        console.error("Erro no fetch:", error)

        return {
          rawHTML: "",
          statusCode: 500
        }
      }
    })

    const results = await Promise.all(promises)
    allResults.push(...results)
  }

  return allResults
}

/**
 * Faz a pesquisa no sistema da defensoria para extrair páginas HTML com os processos
 * @param {{count: 0, status: 0}} pagesData quantidade de páginas, com o respectivo status de cada lista de processos
 * @param {number} system Solar v1 ou v2
 * @param {number} circuit Vara ou defensoria
 * @returns 
 */
async function fetchPages(pagesData, system, circuit) {
  const pageResponses = [{ rawHTML: "", statusCode: 200 }]
  for (let page of pagesData) {
    for (let i = 1; i <= page.count; i++) {
      let solarURL = ""
      if (system === 2) {
        //O ideal seria que essas urls estivessem num .env, mas como o ambiente da aplicação é o navegador, qualquer link é público então perde o sentido.
        solarURL = `https://solar.defensoria.mg.def.br/processo/intimacao/buscar/?situacao=${page.status}&tipo=INT&setor_responsavel=${circuit}&page=${i}`
      } else solarURL = `https://solar.defensoria.mg.def.br/v2/buscar-processos-judiciais?situacao=${page.status}&page_size=100&page=${i}`

      const response = await fetch(solarURL)
      if (!response.ok) {
        pageResponses.push({ rawHTML: "", statusCode: response.status })
        console.error("ERRO NA BUSCA DOS DADOS. CONVOQUE O DESENVOLVEDOR", response.statusText())
      }
      if (pageResponses.length === 1) {
        pageResponses[0].rawHTML = await response.text()
        pageResponses[0].statusCode = 200
        if (pageResponses.length < pagesData.length) pageResponses.push({ rawHTML: "", statusCode: 200 })
      } else {
        pageResponses[pageResponses.length - 1] = { rawHTML: await response.text(), statusCode: 200 }
        if (pageResponses.length < pagesData.length) pageResponses.push({ rawHTML: "", statusCode: 200 })
      }

    }

  };
  console.log("resposta", pageResponses)
  return pageResponses

}


// const promises = urls.map(url =>
//   fetch(url).then(async res => {
//     if (!res.ok) return { rawHTML: "", statusCode: res.status };
//     return { rawHTML: await res.text(), statusCode: 200 };
//   })
// );
// const results = await Promise.all(promises);  // espera todas juntas


/**
 * Retorna a página HTML em formato de document
 * @param {NodeList} lawsuitsStatusDataCount  Quantidade de registros
 * @param {number} system  Solar v1 ou v2
 * @param {number} circuit Vara ou defensoria
 */
async function parseHTML(lawsuitsStatusDataCount, system, circuit) {
  const rawLawsuits = await Promise.all(await batchFetch(lawsuitsStatusDataCount, system, circuit))
  const lawsuitsData = rawLawsuits.map(lawsuits => {
    console.log(lawsuits)
    let parser = new DOMParser()
    const pageData = parser.parseFromString(lawsuits.rawHTML, "text/html")
    console.log(pageData.body)

    return system === 1 ? getEPROCLawsuitsData(pageData) : getEPROCLegacyLawsuitsData(pageData)
  })

  return lawsuitsData
}


/**
 * Define a quantidade total de registros por página.
 * @param {NodeList} pageLawsuitsStatus  Quantidade de registros
 * @param {number} system  Solar v1 ou v2
 */
function getLawsuitsTotalPageNumber(pageLawsuitsStatus, system) {
  const pages = [{ count: 0, status: 0 }]
  let x = 0
  for (const element of pageLawsuitsStatus) {
    if (system === 1 && x > 3) break;
    let count = 0, recordsNumber = system === 2 ? 10 : 100
    if (system === 2) count = parseInt(element.children.item(0).children.item(0).innerHTML)
    else count = parseInt(element.innerHTML)
    let rest = count % recordsNumber
    let roundLawsuitCount = (count - rest) / recordsNumber
    if (rest) roundLawsuitCount++
    if (!x) pages[0] = { count: roundLawsuitCount, status: 10 }
    else pages.push({ count: roundLawsuitCount, status: pages[x - 1].status + 10 })
    x++

  }

  return pages

}

/**
 * Processa os dados do SOLAR V2, EPROC.
 * @param {Document} page página html em plain text que é extraído os dados do rsc 
 * @returns 
 */
function getEPROCLawsuitsData(page) {
  const rscData = page.querySelectorAll("script")
  const rawRsc = Array.from(rscData)
  let queryResults = []
  for (let rsc of rawRsc) {
    //verificação necessária para poder extrair os dados da consulta graphql presente no html da página
    if (rsc.innerHTML.includes("results"))
      //o passo abaixo é necessário porque o JSON quando extraído do rsc é malformatado.
      queryResults = rsc.innerHTML.replaceAll("\\", "").split("results")[1].substring(2).replaceAll('"\"', "").replaceAll('\"comunicacao_tipo_prazo\":,', '\"comunicacao_tipo_prazo\": null,')
  }

  if (queryResults) {
    //A consulta é complexa. Vem ao mês 3 tipos de dados que não se relacionam diretamente com a página.
    const rawResults = queryResults.split('\"defensores\"')
    console.log(rawResults)
    //formata o resto da cadeia JSON para depois torná-lo um JSON válido.
    const lawsuits = rawResults[0].substring(0, rawResults[0].length - 2)
    const rawDefenders = rawResults[1].substring(1, rawResults[1].length).split("total")[0]
    const defenders = JSON.stringify(rawDefenders.substring(0, rawDefenders.length - 2))
    localStorage.setItem("defenders", defenders)
    let results = JSON.parse(lawsuits)
    console.log(results)
    for (let result of results) {
        lawsuitInfo.push({
        "Nº do Processo": result.processo.numero,
        Partes: result.destinatario.pessoa.nome,
        Vara: result.processo.orgaoJulgador.nomeOrgao,
        "Data de Última Movimentação": result.modificado_em,
        "Data Limite": result.prazo_ciencia,
        Prazo: result.prazo_final || result.prazo_ciencia,
        "Último Movimento": result.evento.descricao || "-"

    })

    return lawsuitInfo

    }
    

    // console.log(results)
    // const blob = new Blob([results], { type: "application/json;charset=utf-8;" });
    // const link = document.createElement("a");
    // const url = URL.createObjectURL(blob);
    // link.setAttribute("href", url);
    // const date = new Date()
    // const fileName = "processos" + date.getFullYear().toString() + date.getMonth().toString() + date.getDay().toString() + date.getMilliseconds().toString() + "-NV.json"
    // link.setAttribute("download", fileName);
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
    // URL.revokeObjectURL(url);

  }

  // const rows = page.querySelector(".MuiDataGrid-virtualScrollerRenderZone").children
  // for (let i = 0; i < rows.length; i++) {
  //   const rowData = rows.item(i).children
  //   let lawsuit = rowData.item(2).children.item(0).children.item(1).children.item(0).innerHTML
  //   let circuit = rowData.item(2).children.item(0).children.item(4).children.item(0).children.item(0).innerHTML.substring(9, 12) + "vc";
  //   let event = rowData.item(3).children.item(0).children.item(1).innerHTML
  //   let eventRawDate = rowData.item(3).children.item(0).children.item(0).innerHTML
  //   let eventDate = parseDate(eventRawDate)
  //   let assistido = rowData.item(4).children.item(0).children.item(0).innerHTML
  //   let comunication = rowData.item(5).children.item(0).children.item(0).innerHTML
  //   let deadLineCount = rowData.item(6).children.item(0).children
  //   if (deadLineCount.length > 1) {
  //     let startingDeadlineDate = rowData.item(6).children.item(0).children.item(0).innerHTML
  //     let endingDeadlineDate = rowData.item(6).children.item(0).children.item(1).innerHTML
  //   } else deadlineDate = rowData.item(6).children.item(0).children.item(0).innerHTML

  //   lawsuitInfo.push({
  //     "Nº do Processo": lawsuit,
  //     Partes: assistido,
  //     Vara: circuit,
  //     "Data de Última Movimentação": eventDate,
  //     "Data Limite": deadlineDate || endingDeadlineDate,
  //     Prazo: deadlineDate || endingDeadlineDate,
  //     "Último Movimento": comunication
  //   })


  //}



}


function getEPROCLegacyLawsuitsData(page = new Document()) {
  // DATA DO EXPEDIENTE
  // DATA DA CIÊNCIA (AUTOMÁTICA OU MANUAL)
  // PRAZO
  // NOME DO ASSISTIDO
  // Nº DO PROCESSO
  // VARA
  // CAMPO PARA ESTAGIÁRIO
  // CAMPO DA DATA DE ATRIBUIÇÃO ESTAGIÁRIO
  // CAMPO DO QUE É PARA FAZER (TAREFA). 
  //document.querySelector("#AbrirPrazosForm").children.item(2).children.item(1).rows 
  let lawsuitsTable = page.querySelector('[name="AbrirPrazosForm"]').children.item(2)
  if (lawsuitsTable) {
    const tableElements = lawsuitsTable.children.item(1)
    const tableRows = tableElements.rows.length

    for (let i = 0; i < tableRows; i++) {
      let currentRow = tableElements.rows.item(i)
      const state = currentRow.cells.item(7).children.item(0).children.item(0)
      let claimsStateDate = state.innerHTML.trim().substring(0, 16)
      let claimsStateRawDate = claimsStateDate.substring(6, 10) + "-" + claimsStateDate.substring(3, 5) + "-" + claimsStateDate.substring(0, 2) + "T" + claimsStateDate.substring(11, 17)
      let claimsDate = new Date(claimsStateRawDate)
      let statusClaimsState = ""
      if (claimsDate < Date.now()) {
        if (state.title === "Prazo final para ciência")
          statusClaimsState = state.title + " " + claimsStateDate
        else if (state.title === "Prazo final para resposta")
          statusClaimsState = state.title + " " + claimsStateDate
      }

      lawsuitInfo.push({
        "Nº do Processo": currentRow.cells.item(1).children.item(2).textContent.split("\n")[2].trimStart(),
        Partes: currentRow.cells.item(3).innerHTML.split("\n")[1].trimStart(),
        Vara: currentRow.cells.item(2).innerHTML.split("\n")[3].trimStart(),
        "Data de Última Movimentação": currentRow.cells.item(6).innerText.split("\n")[1].trimStart(),
        "Data Limite": statusClaimsState,
        Prazo: claimsDate,
        "Último Movimento": currentRow.cells.item(4).split("\n")[3].trimStart()
      })

    }

    return lawsuitInfo

  }
}


/**
 * Extrai os dados dos sistemas.
 * @param {number} system 
 * @returns 
 */
function scrapeData(system) {
  system = currentPage.includes("pje.") ? 0 : currentPage.includes("v2") && currentPage.includes("solar") ? 1 : currentPage.includes("solar") ? 2 : -1
  if (system === 0) return getPJELawsuits()
  else if (system === 1 || system === 2) return getEPROCLawsuits(system)
}

/** 
 * Pega os processos do E-proc.
 * @param {number} system 
 * @returns 
 */
async function getEPROCLawsuits(system) {
  const circuit = new URLSearchParams(window.location.href).get("setor_responsavel")
  if (system === 2) {
    if (!circuit) {
      alert("Escolha uma defensoria.")
      return
    }
  }
  const statuses = document.querySelectorAll(system === 1 ? "div.MuiTypography-h5" : ".painel ")
  const lawsuitsStatusDataCount = getLawsuitsTotalPageNumber(statuses, system)
  const lawsuitData = await parseHTML(lawsuitsStatusDataCount, system, circuit)
  console.log("olha os dados do processo", lawsuitData)
  return lawsuitData

}





