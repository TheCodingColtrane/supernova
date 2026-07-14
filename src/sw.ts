import { getHolidays, saveHolidays } from "./eclipse/service/holidays";
import { deleteLawsuits, getLawsuitStatusCount, getPendingLawsuits, getWeekLawsuits, saveLawsuits, updateLawsuits } from "./eclipse/service/lawsuits";
import { deleteTaskData, getTaskData, saveTaskData, updateTaskData } from "./eclipse/service/tasks";
import { deleteWorkerData, getWorkerData, saveWorkerData, updateWorkerData } from "./eclipse/service/workers";
const downloadedPages = new Set()
let targetTabs = new Set();



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    let result
    try {
      switch (request.type) {
        case "RENDER_HTML":
          result = await handleHtmlProcessing(request.payload);
          break;
        case "SAVE_LAWSUITS":
          result = await saveLawsuits(request.payload.lawsuits);
          break;
        case "UPDATE_LAWSUITS":
          result = await updateLawsuits(request.payload.lawsuits);
          break;
        case "DELETE_LAWSUITS":
          result = await deleteLawsuits(request.payload.ids);
          break;
        case "GET_STATUS_COUNT":
          result = await getLawsuitStatusCount();
          break;
        case "GET_WEEK_LAWSUITS":
          result = await getWeekLawsuits()
          break;
        case "GET_PENDING_LAWSUITS":
          result = await getPendingLawsuits()
          break;
        case "SAVE_HOLIDAYS":
          result = await saveHolidays(request.payload.holidays)
          break;
        case "GET_HOLIDAYS":
          result = await getHolidays(request.payload.year)
          break
        case "SAVE_TASK":
          result = await saveTaskData(request.payload.task)
          break;
        case "UPDATE_TASK":
          result = await updateTaskData(request.payload.task)
          break;
        case "DELETE_TASK":
          result = await deleteTaskData(request.payload.id)
          break;
        case "GET_TASKS":
          result = await getTaskData()
          break;
        case "SAVE_WORKER":
          result = await saveWorkerData(request.payload.workers)
          break;
        case "UPDATE_WORKER":
          result = await updateWorkerData(request.payload.workers)
          break;
        case "DELETE_WORKER":
          result = await deleteWorkerData(request.payload.id)
          break;
        case "GET_WORKERS":
          result = await getWorkerData()
          break;
        case "CLOSE_MY_TAB":
          if(sender.tab){
          chrome.tabs.remove(sender.tab.id ?? 0);
          }
          break;

      }
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  })();
  return true

})





chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.url.includes("https://s3-pjedocumentos.tjmg.jus.br") && details.documentLifecycle === "active" && !downloadedPages.has(details.url)) {
    downloadedPages.add(details.url)
    await chrome.downloads.download({
      url: details.url,
      filename: "Processo " + details.url.split("/")[4].substring(0, 25) + ".pdf"

    });
    // finish();
  }

});



chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TRACK_OUTLOOK_TAB") {
    targetTabs.add(message.tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' && targetTabs.has(tabId)) {
    targetTabs.delete(tabId); // Remove do rastreio    
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: "TRIGGER_OUTLOOK_ACTIONS" })
        .catch(err => console.log("Aba fechada ou content script não carregou a tempo", err));
    }, 2000); // Pequeno delay de segurança para garantir a renderização dos botões
  }
});



let isCreatingOffscreen: Promise<void> | null = null;

async function handleHtmlProcessing(htmlString: string): Promise<number[]> {
  try {

    // 1. Gerencia a criação do Offscreen de forma segura
    if (await chrome.offscreen.hasDocument()) {
      // Se já existe, não faz nada, segue o jogo
    } else if (isCreatingOffscreen) {
      // Se já existe outra chamada criando o documento neste exato momento,
      // nós esperamos aquela criação terminar ao invés de tentar criar uma nova
      await isCreatingOffscreen;
    } else {
      // Se não existe e ninguém está criando, nós assumimos a criação e travamos a fila
      isCreatingOffscreen = chrome.offscreen.createDocument({
        url: '/public/blank.html',
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'Converter HTML do tribunal em PDF selecionavel',
      });

      try {
        await isCreatingOffscreen;
      } catch (err: any) {
        // Se der erro porque outra aba/script acabou de criar no mesmo milissegundo
        console.log(err)
        if (!err.message.includes("Only a single offscreen document")) {
          throw err; // Se for outro erro qualquer, repassa adiante
        }
      } finally {
        isCreatingOffscreen = null; // Libera a trava do semáforo
      }
    }

    // 2. Repassa o HTML para dentro do documento Offscreen que criamos
    const response = await chrome.runtime.sendMessage({
      action: 'offscreen',
      payload: htmlString
    });

    if (!response || !response.success) {
      throw new Error(response?.error || "Erro desconhecido no Offscreen");
    }

    return response.data;
  } catch (error) {
    console.error("Erro no processamento do HTML:", error);
    throw error;

  }
}