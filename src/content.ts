import { sendMessage } from "./util";
import { renderAssistedSide, renderSolarDownloadButton } from "./solar/intimacao";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async (e) => {
    console.log(e)
    await renderDownloadButton()
    await renderAssistedSide()

  })
} else {
  renderDownloadButton()
  renderAssistedSide()
}


chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "SEND_EMAIL") {
    triggerEmailActions();
    const status = {success : true}
    sendResponse(JSON.stringify(status))

  }

  if(message.type === "GET_GEMINI_OUTPUT"){

  }
});


async function renderDownloadButton() {
  try {
    const mb = new MutationObserver(async () => {
      if (window.location.href.includes("pje.tjmg"))
        await renderPJEDownloadButton()
      else if (window.location.href.includes("https://solar.defensoria.mg.def.br/processo/intimacao/buscar/")) {
        await renderSolarDownloadButton()

      }
    })
    mb.observe(document.body, {
      childList: true,
      subtree: true
    })
  } catch (error) {
    console.log(error)
  }

}


async function downloadLawsuit(page: Document) {
  const downloadButtonIcon = page.getElementsByClassName("btn-menu-abas dropdown-toggle")[0] as HTMLButtonElement
  downloadButtonIcon.click()
  const downloadButtonArea = page.getElementById("navbar:botoesDownload")
  if (downloadButtonArea) {
    const downloadButton = downloadButtonArea.firstElementChild as HTMLButtonElement
    downloadButton.click()
    await startFlow(page)

  }

}



/**
 * Inicia o fluxo de espera dos elementos da tela para o download do processo.
 * @param {Document} page
 */
async function startFlow(page: Document) {
  await sendMessage("START_WAITING", null)
  await observeModal(page);
}

async function renderPJEDownloadButton() {
  const isMoveButtonVisible = document.getElementById("moverPara")
  if (isMoveButtonVisible) {
    let urls: string[] = []
    let requests = new Array<Promise<void>>()
    const table = document.getElementsByClassName("header-fixed")[0] as HTMLTableElement
    if (!table) return
    if (document.getElementById("download-button-icon")) return
    const rows = Array.from(table.rows)
    for (const r of rows) {
      if (r.firstElementChild?.children.item(0)?.children.item(0)?.children.item(0)?.children.item(0)?.getAttribute("checked")) {
        const div = document.getElementById("formExpedientes:tbExpedientes:j_id602header:sortDiv")
        const actions = document.createElement("div")
        actions.className = "vcenter"
        const baseSpan = document.createElement("span")
        const icon = document.createElement("i")
        icon.id = "download-button-icon"
        icon.className = "fa fa-download fa-lg btn btn-primary btn-sm"
        const toolTipSpan = document.createElement("span")
        toolTipSpan.className = "sr-only"
        toolTipSpan.textContent = "Baixar as processos selecionados"
        icon.addEventListener("click", async (e) => {
          e.preventDefault()
          for (const row of table.rows) {
            let checkedBox = row.cells.item(0)
            if (checkedBox?.firstElementChild?.firstElementChild?.firstElementChild?.firstElementChild?.getAttribute("checked")) {
              const link = row?.cells?.item(2)?.firstElementChild?.firstElementChild?.getAttribute("onclick")?.substring(13)
              if (link)
                urls.push(link.substring(0, link.indexOf("\'")))
            } else continue
          }
          for (let i = 0; i < urls.length; i++) {
            const currentURL = window.open(urls[i], "_blank");
            currentURL?.addEventListener("load", () => {
              requests.push(downloadLawsuit(currentURL.document))
            })
          }
          await Promise.all(requests)
          urls = []
        })
        baseSpan.appendChild(icon)
        baseSpan.appendChild(toolTipSpan)
        actions.appendChild(baseSpan)
        div?.appendChild(actions)
        const divText = document.getElementById("formExpedientes:tbExpedientes:j_id622header:sortDiv")
        if (divText)
          divText.textContent = "Baixar Processos"
        break;
      }
    }

  }

}


async function observeModal(page: Document) {
  const observer = new MutationObserver(async () => {
    const errorModal = page.getElementById("panelAlertContentTable")

    if (!errorModal) return;

    await chrome.runtime.sendMessage({
      type: "MODAL_APPEARED"
    });

    observer.disconnect();

  });

  observer.observe(page.body, {
    childList: true,
    subtree: true
  });

} ''


async function triggerEmailActions() {

    const intervalId = setInterval(() => {
      if (document.querySelector("[data-testid='ComposeSendButton']")) {
        clearInterval(intervalId)
        const buttonDiv = document.querySelector("[data-testid='ComposeSendButton']") as HTMLDivElement
        const importantButton = document.querySelectorAll("[data-automation-type='RibbonToggleButton']")[14] as HTMLButtonElement
        importantButton.click()
        const sendEmailButton = buttonDiv.children.item(0) as HTMLButtonElement
        sendEmailButton.click()
        const sentEmailIntervalId = setInterval(() => {
          if (document.querySelector("[data-automationid='splitbuttonprimary']")) {
            clearInterval(sentEmailIntervalId)
            chrome.runtime.sendMessage({ type: "CLOSE_MY_TAB" });
          }
        }, 1000)
      }

    }, 1000);


  }

