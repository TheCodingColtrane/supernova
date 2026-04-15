// import { getDefenders, setDefenders } from "./background";

// import { checkHolidays } from "../service/holidays";
import type { Defenders } from "../types/defenders";
import type { Lawsuits } from "../types/lawsuits";
import { getDefenders,  sendMessage } from "../utils";
import { getNextBusinessDay, isBusinessDay, localDateToIsoDate } from "../utils/date";
// import { checkHolidays, saveHolidays } from "./service/holidays";
// import { getHolidaysAPI } from "./utils";

const currentPage = document.location.href
let system = 0

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


const getPJELawsuits = () => {

  let table = document.getElementById('formAcervo:tbProcessos') as HTMLTableElement
  if (!table) return
  let rowLength = table.rows.length;
  for (let i = 0; i < rowLength; i++) {
    var oCells = table.rows.item(i)!.cells;
    var cellLength = oCells.length;
    for (var j = 0; j < cellLength; j++) {
      if (j >= 2) {
        let cellVal = oCells.item(j)
        if (cellVal && cellVal.tagName !== 'TH') {
          if (cellVal.className === 'rich-table-cell informacoesProcesso') {
            const lawsuitNumber = cellVal.children.item(0)?.children.item(0)?.children.item(0)?.innerHTML.split(" ")[1]
            const parts = cellVal.children.item(0)?.children.item(1)?.children.item(0)?.innerHTML
            const vara = cellVal.children.item(0)?.children.item(1)?.children.item(1)?.innerHTML
            const distribDate = cellVal.children.item(0)?.children.item(1)?.children.item(2)?.innerHTML
            const lastAction = cellVal.children.item(0)?.children.item(1)?.children.item(3)?.innerHTML
            // const lawsuit = Array<lawsuitInfo>()
            // if (!lawsuitInfo[0]["Nº do Processo"]) {
            //   lawsuitInfo[0]["Nº do Processo"] = lawsuitNumber
            //   lawsuitInfo[0].Partes = parts
            //   lawsuitInfo[0].Vara = vara
            //   lawsuitInfo[0]["Data de Distribuição"] = distribDate
            //   lawsuitInfo[0]["Data de Última Movimentação"] = lastAction.substring(18, 33)
            //   lawsuitInfo[0]["Último Movimento"] = lastAction.substring(36)
            // } else
            lawsuitInfo.push({
              "Nº do Processo": lawsuitNumber ?? "",
              Partes: parts ?? "",
              Vara: vara ?? "",
              "Data de Distribuição": distribDate ?? "",
              "Data de Última Movimentação": lastAction?.substring(18, 33) ?? "",
              "Último Movimento": lastAction?.substring(36) ?? "",
              "Data Limite": new Date(),
              CA: new Date(),
              Prazo: new Date()
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
  let tablePendingLawsuits = document.getElementById('formAcervo:tbProcessos:scPendentes_table') as HTMLTableElement
  if (!tablePendingLawsuits) {
    chrome.runtime.sendMessage({ type: "LAWSUIT_DATA", payload: lawsuitInfo });
    return
  }
  let forwardButton = tablePendingLawsuits.rows.item(0)?.cells.item(11)

  if (forwardButton?.className === ' rich-datascr-button') {
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






function getDeadlineDate(elements: HTMLCollection) {
  let initialDeadline = "", deadline = "", noDeadline = "", awarenessDate = ""
  for (const element of elements) {
    let currentTd = element as HTMLElement
    if(currentTd.title === "Prazo final para ciência")
        awarenessDate = localDateToIsoDate(currentTd.textContent.split("\n")[1]?.trimStart().substring(0, 10)!, false)
     else if(currentTd.title === "Prazo inicial"){
        initialDeadline = localDateToIsoDate(currentTd.textContent.split("\n")[1]?.trimStart().substring(8)!, false)
      }else if(currentTd.title === "Prazo final para resposta"){
        deadline = localDateToIsoDate(currentTd.textContent.split("\n")[1]?.trimStart().substring(0, 10)!, false)
      }else if(currentTd.className === "text-error"){
        if(currentTd.innerHTML.split("\n")[1]?.trimStart() === "Sem prazo final definido"){
            let date = new Date(initialDeadline)
            date = new Date(date.setDate(date.getDate() + 10))
            const isWorkDay = isBusinessDay(date)
            if(!isWorkDay)
              noDeadline =  localDateToIsoDate(new Date(getNextBusinessDay(date)).toLocaleDateString(), false)
            else 
              noDeadline = localDateToIsoDate(date.toLocaleDateString(), false)
        }
      }
  }
    return {initialDeadline, deadline, noDeadline, awarenessDate} 
}




/**
 * Faz a pesquisa no sistema da defensoria para extrair páginas HTML com os processos em lotes.
 * @param {{count: 0, status: 0}} pagesData quantidade de páginas, com o respectivo status de cada lista de processos
 * @param {number} system Solar v1 ou v2
 * @param {number} circuit Vara ou defensoria
 * @returns 
 */
async function batchFetch(pagesData: Array<{ count: number, status: number }>, system: number, circuit: string) {
  const allResults = []

  // transforma pagesData em uma lista de URLs
  const urls = []

  for (const page of pagesData) {
    for (let i = 1; i <= page.count; i++) {
      let solarURL = ""

      if (system === 2) {
        solarURL = `https://solar.defensoria.mg.def.br/processo/intimacao/buscar/?distribuido_operador_logico=OR&situacao=${page.status}&tipo=INT&setor_responsavel=${circuit}&page=${i}`
      } else {
        solarURL = `https://solar.defensoria.mg.def.br/v2/buscar-processos-judiciais?distribuido_operador_logico=OR&situacao=${page.status}&page_size=100&page=${i}`
      }

      urls.push(solarURL)
    }
  }

  // lotes de 3. (ISSO É FEITO PARA EVITAR RATE LIMIT DO SOLAR. NÃO DEFINIR VALOR SUPERIOR A 10.)
  const BATCH_SIZE = 3
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (url) => {
      try {
        const response = await fetch(url)
        if (!response.ok) return { rawHTML: "", statusCode: response.status }
        return { rawHTML: await response.text(), statusCode: 200 }
      } catch (error) {
        console.error("Erro no fetch:", error)
        return { rawHTML: "", statusCode: 500 }
      }
    })

    const results = await Promise.all(promises)
    allResults.push(...results)
  }

  return allResults
}


/**
 * Retorna a página HTML em formato de document
 * @param {{count: 0, status: 0}} lawsuitsStatusDataCount  Quantidade de registros
 * @param {number} system  Solar v1 ou v2
 * @param {number} circuit Vara ou defensoria
 */
async function parseHTML(lawsuitsStatusDataCount: Array<{ count: number, status: number }>, system: number, circuit: string) {
  const rawLawsuits = await Promise.all(await batchFetch(lawsuitsStatusDataCount, system, circuit))
  let lawsuitsData = []
  const defenders = await getDefenders()
  if(!defenders) return
  for (let lawsuit of rawLawsuits) {
    let parser = new DOMParser()
    const pageData = parser.parseFromString(lawsuit.rawHTML, "text/html")
    if (system === 1) {
      const result = getEPROCLawsuitsData(pageData, defenders)
      if(result)
      lawsuitsData.push(...result)
      }
    else{
      const result = getEPROCLegacyLawsuitsData(pageData, defenders)
      if(result)
      lawsuitsData.push(...result)
    } 

  }
  // if (system === 1) {
  //   let year = new Date()
  //   const lawsuits = lawsuitsData
  //   const hasPreviousYear = lawsuits.filter(c => c.status === "Aberto" || c.status === "Aguardando Abertura")
  //     .some(c => new Date(c.initialDeadline).getFullYear() < year.getFullYear() || new Date(c.deadline).getFullYear() < year.getFullYear())
  //   const hasHolidays = await sendMessage("GET_HOLIDAYS", { year: hasPreviousYear ? year.setFullYear(year.getFullYear() - 1) : year })
  //   if (!hasHolidays) {
  //     await sendMessage("SAVE_HOLIDAYS", hasPreviousYear ? year.getFullYear() - 1 : year)
  //   }

  // }




  // .map((data) => {
  //   for (lawsuit of filteredLawsuits) {
  //     let deadline = new Date(lawsuit.deadline)
  //     let initialDeadline = new Date(lawsuit.initialDeadline)
  //     if (initialDeadline.getFullYear() !== uniqueYears.find(c == initialDeadline.getFullYear()))
  //       uniqueYears.add(initialDeadline)
  //     else if (deadline.getFullYear() !== uniqueYears.find(c == deadline.getFullYear()))
  //       uniqueYears.add(deadline)
  //   }



  // })
  return lawsuitsData


}



/**
 * Define a quantidade total de registros por página.
 * @param {NodeList} pageLawsuitsStatus  Quantidade de registros
 * @param {number} system  Solar v1 ou v2
 */
function getLawsuitsTotalPageNumber(pageLawsuitsStatus: NodeList, system: number) {
  console.log("odada")
  const pages = Array<{ count: number, status: number }>()
  let x = 0
  for (let element of pageLawsuitsStatus) {
    let newElement = element as HTMLElement
    if (system === 1 && x > 3) break;
    let count = 0, recordsNumber = system === 2 ? 10 : 100
    if (system === 2) count = parseInt(newElement.children.item(0)?.children.item(0)?.innerHTML ?? "")
    else count = parseInt(newElement.innerHTML)
    if (count < recordsNumber) {
      pages.push({ count: 1, status: pages.length ? pages[x - 1]!.status + 10 : 10 })
      x++
      continue
    }
    let rest = count % recordsNumber
    let roundLawsuitCount = (count - rest) / recordsNumber
    if (rest) roundLawsuitCount++
    pages.push({ count: roundLawsuitCount, status: pages.length ? pages[x - 1]!.status + 10 : 10 })
    x++

  }

  return pages

}

/**
 * Processa os dados do SOLAR V2, EPROC.
 * @param {Document} page página html em plain text que é extraído os dados do rsc 
 * @returns 
 */
function getEPROCLawsuitsData(page: Document, defenders: Defenders[]) {
  const rscData = page.querySelectorAll("script")
  const rawRsc = Array.from(rscData)
  let queryResults = ""
  for (let rsc of rawRsc) {
    //verificação necessária para poder extrair os dados da consulta graphql presente no html da página
    if (rsc.innerHTML.includes("results"))
      //o passo abaixo é necessário porque o JSON quando extraído do rsc é malformatado
      queryResults = rsc.innerHTML
        .replaceAll("\\", "")
        .split("results")[1]!
        .substring(2)
        .replaceAll('"\"', "")
        .replaceAll('\"comunicacao_tipo_prazo\":,', '\"comunicacao_tipo_prazo\": null,')
  }

  if (queryResults) {
    //A consulta é complexa. Vem ao menos 3 tipos de dados que não se relacionam diretamente com a requisição.
    const rawResults = queryResults.split('\"defensores\"')
    //o solar trás um json malformatado. 
    //Abaixo é necessário formatar o resto da cadeia JSON para depois torná-lo um JSON válido.
    const lawsuits = rawResults[0]?.substring(0, rawResults[0].length - 2)
    if (!lawsuits) return []
    let results = JSON.parse(lawsuits)
    console.log(results)
    const filedLawsuits = Array<Lawsuits>()
    for (let result of results) {

      filedLawsuits.push({
        number: result.processo.numero,
        circuit: result.processo.orgaoJulgador.nomeOrgao,
        status: result.situacao,
        assisted: result.destinatario.pessoa.nome,
        isDefendant: result.polo_destinatario === "PA" ? false : true,
        source: result.sistema_webservice,
        awarenessDate: result.prazo_ciencia,
        initialDeadline: result.prazo_inicial ? result.prazo_inicial.split("T")[0] : "",
        deadline: function (deadline) { return deadline.split("T")[0] }(result.prazo_final || result.prazo_ciencia),
        givenDeadLine: result.prazo_inicial && result.prazo_final ? function (startingDate: string, endingDate: string) {
          const diffTime = Math.abs(new Date(endingDate).getTime() - new Date(startingDate).getTime())
          return Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }(result.prazo_inicial, result.prazo_final) : 0,
        defender: defenders?.find((c: Defenders) => c.cpf === result.distribuido_cpf) ?? defenders?.filter(c => c.atuacoes.filter(c => c.defensoria.name === ""))!

      })
    }

    return filedLawsuits

  }

}


function getEPROCLegacyLawsuitsData(page: Document, defenders: Defenders[] | undefined) {
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
  let lawsuitsTable = page.querySelector('[name="AbrirPrazosForm"]')?.children.item(2)
  if (lawsuitsTable) {
    const tableElements = lawsuitsTable.children.item(1) as HTMLTableElement
    const tableRows = tableElements.rows.length
    const pickedDefensory = document.querySelector("#id_setor_responsavel") as HTMLSelectElement
    const defensory = pickedDefensory.selectedOptions.item(0)?.innerHTML!
    const lawsuits = Array<Lawsuits>()
    for (let i = 0; i < tableRows; i++) {
      let currentRow = tableElements.rows.item(i)
      let initialDeadline = "", deadline = "", awarenessDate = "", 
      number = "", circuit = "", assisted = "", source = "", 
      defender = "", status = "", tab = "", dates = getDeadlineDate(currentRow?.cells.item(7)?.children.item(0)?.children!)
      number = currentRow?.cells.item(1)?.children.item(2)?.textContent?.split('\n')[2]?.trimStart()!
      circuit = currentRow?.cells.item(2)!.innerHTML.split("\n")[3]?.trimStart()!
      assisted = currentRow?.cells.item(3)!.innerHTML.split("\n")[1]?.trimStart()!
      source = currentRow?.cells.item(8)?.innerHTML.split("\n")[1]?.trimStart()!
      defender = currentRow?.cells.item(1)?.children.item(0)?.innerHTML.
      replaceAll("<br>", " ").split("\n")[1]?.trimStart()!
      tab = currentRow?.cells.item(9)?.innerHTML.split("\n")[1]?.trimStart()!
      if (tab === "Aguardando Abertura") {
        status = "Aguardando Abertura"
        awarenessDate = dates.awarenessDate
        deadline = dates.awarenessDate
      }else if (tab === "Aberto") {
        status = "Aberto"
        initialDeadline = dates.initialDeadline
        deadline = dates.deadline
      }else if (tab === "Decurso de Prazo"){
        status = "Decurso de Prazo"
        awarenessDate = dates.awarenessDate
        deadline = dates.deadline
      }else if (tab === "Fechado"){
        status = "Fechado"
        initialDeadline = dates.initialDeadline
        deadline = dates.deadline
        awarenessDate = dates.awarenessDate
      }

      if (currentRow) {
        lawsuits.push({
          number,
          circuit,
          status,
          assisted,
          isDefendant: true, // A interface do solar v1 não apresenta a informação se é autor ou réu sem o uso de uum fetch adiconal.
          source,
          awarenessDate,
          initialDeadline,
          deadline,
          givenDeadLine: initialDeadline && deadline ? function (startingDate: string, endingDate: string) {
            const diffTime = Math.abs(new Date(endingDate).getTime() - new Date(startingDate).getTime())
            return Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }(initialDeadline, deadline) : 0,
          defender: defenders?.find((c: Defenders) => c.nome === defender) ?? defenders?.filter(c => c.atuacoes.filter(c => c.defensoria.name === defensory))!

        })
      }


    }

    return lawsuits

  }
}


/**
 * Extrai os dados dos sistemas.
 */
async function scrapeData() {
  system = currentPage.includes("pje.") ? 0 : currentPage.includes("v2") && currentPage.includes("solar") ? 1 : currentPage.includes("solar") ? 2 : -1
  if (system === 0) return getPJELawsuits()
  else if (system === 1 || system === 2) {
    const data = await getEPROCLawsuits(system)
    if (data) {
      let res = await sendMessage("SAVE_LAWSUITS", { lawsuits: data})
    }

  }

}

//rocesso adm etaa do rj ara saber q etaa esta o rojetoi. Cada etapa vai ser configuravel
//peças o docs q eles subiram
// imoortar maa do rj. Kml geojson, faz o maemento do lugar. Tem que gerar um maa, tem outras coisas mais
/** 
 * Pega os processos do E-proc.
 * @param {number} system 
 * @returns 
 */
async function getEPROCLawsuits(system: number) {
  const circuit = new URLSearchParams(window.location.href).get("setor_responsavel")
  if (system === 2) {
    if (!circuit) {
      alert("Escolha uma defensoria.")
      return
    }
  }
  const statuses = document.querySelectorAll(system === 1 ? "div.MuiTypography-h5" : ".painel ")
  const lawsuitsStatusDataCount = getLawsuitsTotalPageNumber(statuses, system)
  const lawsuitData = await parseHTML(lawsuitsStatusDataCount, system, circuit!)
  return lawsuitData

}

