"use strict";

// src/core/utils.ts
async function sendMessage(message, data) {
  try {
    console.log("oi");
    const response = await chrome.runtime.sendMessage({ type: message, payload: data });
    if (response?.success === false) {
      console.error("Erro no SW:", response.error);
      throw new Error(response.error);
    }
    return response;
  } catch (error) {
    console.error("Falha ao enviar mensagem para SW:", error);
    if (chrome.runtime.lastError) {
      console.error("Detalhe do erro:", chrome.runtime.lastError.message);
    }
    throw error;
  }
}
async function getDefendersAPI() {
  try {
    const response = await fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=true&limit=1000");
    return await response.json();
  } catch (error) {
    console.log(error);
  }
}
async function getDefenders() {
  const THIRTY_DAYS = 1e3 * 60 * 60 * 24 * 30;
  let data = await chrome.storage.local.get("nextUpdate");
  if (!Object.hasOwn(data, "nextUpdate") || Date.now() >= data.nextUpdate) {
    const currentDefenders = await getDefendersAPI();
    if (currentDefenders) {
      await chrome.storage.local.set({
        defenders: currentDefenders.results,
        cacheVersion: "1.0",
        nextUpdate: Date.now() + THIRTY_DAYS
      });
      return currentDefenders.results;
    }
    return;
  }
  data = await chrome.storage.local.get("defenders");
  return data.defenders;
}

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = /* @__PURE__ */ Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/addDays.js
function addDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount)) return constructFrom(options?.in || date, NaN);
  if (!amount) return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}

// src/core/utils/date.ts
function localDateToIsoDate(date, time) {
  date = date.replaceAll("/", "-");
  if (time && date.includes(":")) {
    const aux2 = date.substring(0, 10).split("-");
    return aux2[2] + "-" + aux2[1] + "-" + aux2[0] + "T" + date.substring(10);
  }
  const aux = date.split("-");
  return aux[2] + "-" + aux[1] + "-" + aux[0];
}
function isBusinessDay(date) {
  if (date.getDay() === 6 || date.getDay() === 0)
    return false;
  return true;
}
function getNextBusinessDay(date) {
  const day = date.getDay();
  if (!isBusinessDay(date))
    return addDays(date, day === 6 ? 2 : 1);
  else
    return addDays(date, 1);
}

// src/core/controller/content.ts
var currentPage = document.location.href;
var system = 0;
var lawsuitInfo = [{
  "N\xBA do Processo": "",
  Partes: "",
  Vara: "",
  "Data de Distribui\xE7\xE3o": "",
  "Data de \xDAltima Movimenta\xE7\xE3o": "",
  "\xDAltimo Movimento": "",
  CA: /* @__PURE__ */ new Date(),
  Prazo: /* @__PURE__ */ new Date(),
  "Data Limite": /* @__PURE__ */ new Date()
}];
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startExtraction") {
    if (system > -1 || system < 3) scrapeData();
    else {
      alert("H\xE1 suporte somente ao sistema SOLAR e o PJE. Favor entrar em contato com o desenvolvedor.");
      return;
    }
  }
});
var getPJELawsuits = () => {
  let table = document.getElementById("formAcervo:tbProcessos");
  if (!table) return;
  let rowLength = table.rows.length;
  for (let i = 0; i < rowLength; i++) {
    var oCells = table.rows.item(i).cells;
    var cellLength = oCells.length;
    for (var j = 0; j < cellLength; j++) {
      if (j >= 2) {
        let cellVal = oCells.item(j);
        if (cellVal && cellVal.tagName !== "TH") {
          if (cellVal.className === "rich-table-cell informacoesProcesso") {
            const lawsuitNumber = cellVal.children.item(0)?.children.item(0)?.children.item(0)?.innerHTML.split(" ")[1];
            const parts = cellVal.children.item(0)?.children.item(1)?.children.item(0)?.innerHTML;
            const vara = cellVal.children.item(0)?.children.item(1)?.children.item(1)?.innerHTML;
            const distribDate = cellVal.children.item(0)?.children.item(1)?.children.item(2)?.innerHTML;
            const lastAction = cellVal.children.item(0)?.children.item(1)?.children.item(3)?.innerHTML;
            lawsuitInfo.push({
              "N\xBA do Processo": lawsuitNumber ?? "",
              Partes: parts ?? "",
              Vara: vara ?? "",
              "Data de Distribui\xE7\xE3o": distribDate ?? "",
              "Data de \xDAltima Movimenta\xE7\xE3o": lastAction?.substring(18, 33) ?? "",
              "\xDAltimo Movimento": lastAction?.substring(36) ?? "",
              "Data Limite": /* @__PURE__ */ new Date(),
              CA: /* @__PURE__ */ new Date(),
              Prazo: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
  }
  nextPage();
  return lawsuitInfo;
};
function nextPage() {
  let tablePendingLawsuits = document.getElementById("formAcervo:tbProcessos:scPendentes_table");
  if (!tablePendingLawsuits) {
    chrome.runtime.sendMessage({ type: "LAWSUIT_DATA", payload: lawsuitInfo });
    return;
  }
  let forwardButton = tablePendingLawsuits.rows.item(0)?.cells.item(11);
  if (forwardButton?.className === " rich-datascr-button") {
    forwardButton.click();
    const interval = setInterval(() => {
      const isLoaded = document.getElementById("_viewRoot:status.start");
      if (isLoaded && isLoaded.style.display === "none") {
        clearInterval(interval);
        getPJELawsuits();
      }
    }, 1e3);
  } else {
    chrome.runtime.sendMessage({ type: "LAWSUIT_DATA", payload: lawsuitInfo });
    return lawsuitInfo;
  }
}
function getDeadlineDate(elements) {
  let initialDeadline = "", deadline = "", noDeadline = "", awarenessDate = "";
  for (const element of elements) {
    let currentTd = element;
    if (currentTd.title === "Prazo final para ci\xEAncia")
      awarenessDate = localDateToIsoDate(currentTd.textContent.split("\n")[1]?.trimStart().substring(0, 10), false);
    else if (currentTd.title === "Prazo inicial") {
      initialDeadline = localDateToIsoDate(currentTd.textContent.split("\n")[1]?.trimStart().substring(8), false);
    } else if (currentTd.title === "Prazo final para resposta") {
      deadline = localDateToIsoDate(currentTd.textContent.split("\n")[1]?.trimStart().substring(0, 10), false);
    } else if (currentTd.className === "text-error") {
      if (currentTd.innerHTML.split("\n")[1]?.trimStart() === "Sem prazo final definido") {
        let date = new Date(initialDeadline);
        date = new Date(date.setDate(date.getDate() + 10));
        const isWorkDay = isBusinessDay(date);
        if (!isWorkDay)
          noDeadline = localDateToIsoDate(new Date(getNextBusinessDay(date)).toLocaleDateString(), false);
        else
          noDeadline = localDateToIsoDate(date.toLocaleDateString(), false);
      }
    }
  }
  return { initialDeadline, deadline, noDeadline, awarenessDate };
}
async function batchFetch(pagesData, system2, circuit) {
  const allResults = [];
  const urls = [];
  for (const page of pagesData) {
    for (let i = 1; i <= page.count; i++) {
      let solarURL = "";
      if (system2 === 2) {
        solarURL = `https://solar.defensoria.mg.def.br/processo/intimacao/buscar/?distribuido_operador_logico=OR&situacao=${page.status}&tipo=INT&setor_responsavel=${circuit}&page=${i}`;
      } else {
        solarURL = `https://solar.defensoria.mg.def.br/v2/buscar-processos-judiciais?distribuido_operador_logico=OR&situacao=${page.status}&page_size=100&page=${i}`;
      }
      urls.push(solarURL);
    }
  }
  const BATCH_SIZE = 3;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return { rawHTML: "", statusCode: response.status };
        return { rawHTML: await response.text(), statusCode: 200 };
      } catch (error) {
        console.error("Erro no fetch:", error);
        hideLoadingIcon();
        return { rawHTML: "", statusCode: 500 };
      }
    });
    const results = await Promise.all(promises);
    allResults.push(...results);
  }
  return allResults;
}
async function parseHTML(lawsuitsStatusDataCount, system2, circuit) {
  const rawLawsuits = await Promise.all(await batchFetch(lawsuitsStatusDataCount, system2, circuit));
  let lawsuitsData = [];
  const defenders = await getDefenders();
  if (!defenders) return;
  for (let lawsuit of rawLawsuits) {
    let parser = new DOMParser();
    const pageData = parser.parseFromString(lawsuit.rawHTML, "text/html");
    if (system2 === 1) {
      const result = getEPROCLawsuitsData(pageData, defenders);
      if (result)
        lawsuitsData.push(...result);
    } else {
      const result = getEPROCLegacyLawsuitsData(pageData, defenders);
      if (result)
        lawsuitsData.push(...result);
    }
  }
  return lawsuitsData;
}
function getLawsuitsTotalPageNumber(pageLawsuitsStatus, system2) {
  const pages = Array();
  let x = 0, breaker = 0;
  for (let element of pageLawsuitsStatus) {
    if (breaker === 2) return pages;
    let newElement = element;
    if (system2 === 1 && x > 3) break;
    let count = 0, recordsNumber = system2 === 2 ? 10 : 100;
    if (system2 === 2) count = parseInt(newElement.children.item(0)?.children.item(0)?.innerHTML ?? "");
    else count = parseInt(newElement.innerHTML);
    if (count < recordsNumber) {
      pages.push({ count: 1, status: pages.length ? pages[x - 1].status + 10 : 10 });
      x++;
      breaker++;
      continue;
    }
    let rest = count % recordsNumber;
    let roundLawsuitCount = (count - rest) / recordsNumber;
    if (rest) roundLawsuitCount++;
    pages.push({ count: roundLawsuitCount, status: pages.length ? pages[x - 1].status + 10 : 10 });
    x++;
    breaker++;
  }
  return pages;
}
function getEPROCLawsuitsData(page, defenders) {
  const rscData = page.querySelectorAll("script");
  const rawRsc = Array.from(rscData);
  let queryResults = "";
  for (let rsc of rawRsc) {
    if (rsc.innerHTML.includes("results"))
      queryResults = rsc.innerHTML.replaceAll("\\", "").split("results")[1].substring(2).replaceAll('""', "").replaceAll('"comunicacao_tipo_prazo":,', '"comunicacao_tipo_prazo": null,');
  }
  if (queryResults) {
    const rawResults = queryResults.split('"defensores"');
    const lawsuits = rawResults[0]?.substring(0, rawResults[0].length - 2);
    if (!lawsuits) return [];
    let results = JSON.parse(lawsuits);
    console.log(results);
    const filedLawsuits = Array();
    for (let result of results) {
      filedLawsuits.push({
        number: result.processo.numero,
        circuit: result.processo.orgaoJulgador.nomeOrgao.replaceAll("Ju\xEDzo da ", ""),
        status: result.situacao,
        assisted: result.destinatario.pessoa.nome,
        isDefendant: result.polo_destinatario === "PA" ? false : true,
        source: result.sistema_webservice,
        awarenessDate: result.prazo_ciencia,
        initialDeadline: result.prazo_inicial ? result.prazo_inicial.split("T")[0] : "",
        deadline: (function(deadline) {
          return deadline.split("T")[0];
        })(result.prazo_final || result.prazo_ciencia),
        givenDeadLine: result.prazo_inicial && result.prazo_final ? (function(startingDate, endingDate) {
          const diffTime = Math.abs(new Date(endingDate).getTime() - new Date(startingDate).getTime());
          return Math.floor(diffTime / (1e3 * 60 * 60 * 24));
        })(result.prazo_inicial, result.prazo_final) : 0,
        defender: defenders?.find((c) => c.cpf === result.distribuido_cpf) ?? defenders?.filter((c) => c.atuacoes.filter((c2) => c2.defensoria.name === ""))
      });
    }
    return filedLawsuits;
  }
}
function getEPROCLegacyLawsuitsData(page, defenders) {
  let lawsuitsTable = page.querySelector('[name="AbrirPrazosForm"]')?.children.item(2);
  if (lawsuitsTable) {
    const tableElements = lawsuitsTable.children.item(1);
    const tableRows = tableElements.rows.length;
    const pickedDefensory = document.querySelector("#id_setor_responsavel");
    const defensory = pickedDefensory.selectedOptions.item(0)?.innerHTML;
    const lawsuits = Array();
    for (let i = 0; i < tableRows; i++) {
      let currentRow = tableElements.rows.item(i);
      let initialDeadline = "", deadline = "", awarenessDate = "", number = "", circuit = "", assisted = "", source = "", defender = "", status = "", tab = "", dates = { initialDeadline: "", deadline: "", noDeadline: "", awarenessDate: "" };
      if (!currentRow?.cells.item(7)?.children.item(0)?.children) {
        console.log("lihas", tableRows);
        return lawsuits;
      }
      dates = getDeadlineDate(currentRow?.cells.item(7)?.children.item(0)?.children);
      number = currentRow?.cells.item(1)?.children.item(2)?.textContent?.split("\n")[2]?.trimStart();
      circuit = currentRow?.cells.item(2).innerHTML.split("\n")[3]?.trimStart().replaceAll("Ju\xEDzo da ", "");
      assisted = currentRow?.cells.item(3).innerHTML.split("\n")[1]?.trimStart();
      source = currentRow?.cells.item(8)?.innerHTML.split("\n")[1]?.trimStart();
      defender = currentRow?.cells.item(1)?.children.item(0)?.innerHTML.replaceAll("<br>", " ").split("\n")[1]?.trimStart();
      tab = currentRow?.cells.item(9)?.innerHTML.split("\n")[1]?.trimStart();
      if (tab === "Aguardando Abertura") {
        status = "Aguardando Abertura";
        awarenessDate = dates.awarenessDate;
        deadline = dates.awarenessDate;
      } else if (tab === "Aberto") {
        status = "Aberto";
        initialDeadline = dates.initialDeadline;
        deadline = dates.deadline ?? dates.initialDeadline;
      } else if (tab === "Decurso de Prazo") {
        status = "Decurso de Prazo";
        awarenessDate = dates.awarenessDate;
        deadline = dates.deadline;
      } else if (tab === "Fechado") {
        status = "Fechado";
        initialDeadline = dates.initialDeadline;
        deadline = dates.deadline ?? dates.noDeadline;
        awarenessDate = dates.awarenessDate;
      }
      if (currentRow) {
        lawsuits.push({
          number,
          circuit,
          status,
          assisted,
          isDefendant: true,
          // A interface do solar v1 não apresenta a informação se é autor ou réu sem o uso de uum fetch adiconal.
          source,
          awarenessDate,
          initialDeadline,
          deadline,
          givenDeadLine: initialDeadline && deadline ? (function(startingDate, endingDate) {
            const diffTime = Math.abs(new Date(endingDate).getTime() - new Date(startingDate).getTime());
            return Math.floor(diffTime / (1e3 * 60 * 60 * 24));
          })(initialDeadline, deadline) : 0,
          defender: defenders?.find((c) => c.nome === defender) ?? defenders?.filter((c) => c.atuacoes.filter((c2) => c2.defensoria.name === defensory))
        });
      }
    }
    return lawsuits;
  }
}
function renderLoadingIcon() {
  if (document.querySelector(".loader-overlay")) {
    const loading = document.querySelector(".loader-overlay");
    loading.style.display = "block";
    return;
  }
  const loader = document.createElement("div");
  loader.className = "loader-overlay";
  const style = document.createElement("style");
  style.innerHTML = `
  html, body {
    margin: 0;
    padding: 0;
  }

  .loader-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 999999;
  }

  .loader {
  width: 120px;
  height: 120px;
  border: 10px solid rgba(255,255,255,0.2);
  border-top: 10px solid ##4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loader-text {
    color: white;
    margin-top: 20px;
    font-size: 18px;
    font-family: sans-serif;
  }
`;
  document.head.appendChild(style);
  const spinner = document.createElement("div");
  spinner.className = "loader";
  const text = document.createElement("div");
  text.className = "loader-text";
  text.textContent = "Carregando  ...";
  loader.appendChild(spinner);
  loader.appendChild(text);
  document.body.appendChild(loader);
}
function hideLoadingIcon() {
  if (document.querySelector(".loader-overlay")) {
    const loading = document.querySelector(".loader-overlay");
    loading.style.display = "none";
  }
}
async function scrapeData() {
  system = currentPage.includes("pje.") ? 0 : currentPage.includes("v2") && currentPage.includes("solar") ? 1 : currentPage.includes("solar") ? 2 : -1;
  renderLoadingIcon();
  if (system === 0) return getPJELawsuits();
  else if (system === 1 || system === 2) {
    const data = await getEPROCLawsuits(system);
    if (data) {
      let res = await sendMessage("SAVE_LAWSUITS", { lawsuits: data });
      hideLoadingIcon();
    }
  }
}
async function getEPROCLawsuits(system2) {
  const circuit = new URLSearchParams(window.location.href).get("setor_responsavel");
  if (system2 === 2) {
    if (!circuit) {
      alert("Escolha uma defensoria.");
      return;
    }
  }
  const statuses = document.querySelectorAll(system2 === 1 ? "div.MuiTypography-h5" : ".painel ");
  const lawsuitsStatusDataCount = getLawsuitsTotalPageNumber(statuses, system2);
  const lawsuitData = await parseHTML(lawsuitsStatusDataCount, system2, circuit);
  return lawsuitData;
}
//# sourceMappingURL=content.js.map
