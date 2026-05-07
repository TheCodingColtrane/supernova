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
async function getUserCredentials() {
  const creds = JSON.parse(localStorage.getItem("user") ?? "{}");
  if (Object.hasOwn(creds, "id")) return creds;
  await chrome.tabs.create({ url: "defenders.html?onboard=1" });
}

// src/core/controller/popup.ts
document.addEventListener("DOMContentLoaded", async (e) => {
  const userCreds = await getUserCredentials();
  const cards = Array.from(document.querySelectorAll(".status-card"));
  for (const card of cards) {
    const status = card.className.split(" ")[1];
    card.addEventListener("click", () => {
      chrome.tabs.create({ url: "dashboard.html?status=" + status });
    });
  }
});
function renderTable(headers, data) {
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
    const rowValues = Object.values(row);
    for (let i = 0; i < headers.length; i++) {
      let cell = currentRow.insertCell();
      cell.innerHTML = rowValues[i] !== void 0 ? String(rowValues[i]) : "";
    }
  }
  document.body.appendChild(table);
}
document.addEventListener("DOMContentLoaded", async (e) => {
  try {
    const statusCount = sendMessage("GET_STATUS_COUNT", {});
    const weekLawsuits = sendMessage("GET_WEEK_LAWSUITS", {});
    const queries = await Promise.all([statusCount, weekLawsuits]);
    console.log("olha as consultasa", queries[1].data);
    if (queries[0]) {
      document.querySelector("#open-status").innerHTML = queries[0].data.Aberto;
      document.querySelector("#pending-status").innerHTML = queries[0].data["Aguardando Abertura"];
    }
    if (queries[1].data)
      renderTable(["Processo", "Assistido(a)", "Prazo Final", "Status"], queries[1].data);
  } catch (error) {
    console.log(error);
  }
});
document.getElementById("coletar")?.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: "startExtraction" });
    console.log("Mensagem enviada para content.js");
  });
});
//# sourceMappingURL=popup.js.map
