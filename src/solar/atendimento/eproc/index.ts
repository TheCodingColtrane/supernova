import { PDFDocument, rgb } from "pdf-lib"
import { concurrentDownload, downloadPDF, sendMessage } from "../../../util"


(async () => {
    const interval = setInterval(async () => {
        const pageLink = document.location.href
        if (pageLink.includes("grau") && pageLink.includes("atendimento") && pageLink.includes("eproc")) {
            const pageDownloadButton = document.querySelector("#botaoDocumentoUnificado")
            if (pageDownloadButton) {
                clearInterval(interval)
                await renderDownloadButton()
                renderSortLawsuitButton()
            }
        }
    }, 1000)

})();






export function sortEvents() {
    const sortBtn = document.querySelector("#botaoOrdenarProcesso") as HTMLButtonElement
    const events = Array.from(document.querySelectorAll('[ng-repeat="evento in eproc.processo.eventos | orderBy:\'-data_protocolo\'"]') as NodeListOf<HTMLDivElement>).
        filter(c => c.style.marginBottom === "0px")?.reverse()
    const documentList = document.querySelectorAll(".span3").item(4)
    documentList.replaceChildren(...events)
    if (sortBtn) {
        if (sortBtn.dataset.orderBy === "asc") {
            sortBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Ordenar Ascendente'
            sortBtn.dataset.orderBy = "desc"
        }
        else {
            sortBtn.innerHTML = '<i class="fas fa-arrow-up"></i> Ordenar Descendente'
            sortBtn.dataset.orderBy = "asc"
        }
    }
}

export async function forceUpdate(lawsuit: string) {
    const response = await fetch("https://solar.defensoria.mg.def.br/procapi/processo/" + lawsuit + "/consultar/?forcar_atualizacao=true")
    if (response.ok) return true
    else return false
}


export function renderSortLawsuitButton() {
    const downloadButton = document.querySelector("#botaoDocumentoUnificado")
    if (downloadButton) {
        const parentDiv = downloadButton?.parentElement?.parentElement as HTMLDivElement
        const span = document.createElement("span")
        const sortButton = document.createElement("button")
        sortButton.className = "btn btn-secondary"
        sortButton.id = "sortLawsuit"
        sortButton.textContent = "Ordernar Ascendente"
        sortButton.dataset.orderBy = "asc"
        sortButton.onclick = sortEvents
        const sortIcon = document.createElement("i")
        sortIcon.className = "fas fa-arrow-up"
        sortButton.append(sortIcon)
        span.appendChild(sortButton)
        parentDiv.append(span)
        downloadButton.remove()
    }

}



export async function renderDownloadButton() {
    const legacyDownloadButton = document.querySelector("#botaoDocumentoUnificado")
    if (legacyDownloadButton) {
        const parentDiv = legacyDownloadButton.parentElement as HTMLSpanElement
        const downloadButton = document.createElement("button")
        downloadButton.className = "btn btn-secondary"
        downloadButton.id = "downloadLawsuit"
        downloadButton.textContent = "Fazer download do processo"
        const downloadIcon = document.createElement("i")
        downloadIcon.className = "fas fa-download"
        downloadButton.addEventListener("click", async () => await downloadLawsuit(document))
        downloadButton.appendChild(downloadIcon)
        parentDiv.appendChild(downloadButton)

    }
}

export async function downloadLawsuit(page: Document) {
    const downloadButton = page.querySelector("#downloadLawsuit")
    if (downloadButton) {
        const downloadUrls = getEPROCAPIURI(page)
        const documents = new Array(downloadUrls?.documents.length) as ArrayBuffer[]
        if (!downloadUrls) return
        createDownloadToast()
        await concurrentDownload(
            downloadUrls.documents, 
            10,
            async (url: string, i: number) => {
                const res = await fetch(url)
                const headers = res.headers
                console.log(headers.get("Content-Type"))
                const isHtml = headers.get("Content-Type")?.includes("text/html")
                if (isHtml) {
                    const isUTF8 = headers.get("Content-Type") === "text/html; charset=utf-8"
                    const buffer = await res.arrayBuffer();
                    const htmlText = new TextDecoder(isUTF8 ? "utf-8" : "iso-8859-1").decode(buffer);
                    const result = await sendToOffscreenProcessor(htmlText)
                    documents[i] = result.content

                } else
                    documents[i] = await res.arrayBuffer()
                updateDownloadProgress(Math.round(i / documents.length * 100))

            }

        )
        const pdf = await mergePDF(documents, downloadUrls.events)
        await downloadPDF(pdf, page.location.href.split("/")[7])
        finishDownloadToast()
    }

}


function getEPROCAPIURI(page: Document) {
    const lawsuitDocuments: string[] = []
    const documentList = page.querySelectorAll(".span3").item(4)
    const documents = Array.from(documentList.querySelectorAll(".ng-scope"))
    const filteredDocuments = documents.map(c => c.children.item(2)).filter(c => c)
    const lawsuit = filteredDocuments.map(c => c?.children?.item(0)?.children.item(1)).filter(c => c?.children.length ?? 0 > 1)
    const isEPROC = page.querySelector(".label.label-success.ng-scope.ng-binding")?.innerHTML.includes("EPROC")
    const events: [{ id: string, documents: number, isEPROC: boolean }] = [{ id: "", documents: 0, isEPROC: true }]

    if (isEPROC) {
        events.push(...lawsuit.map(c => {
            const eventCount = c?.children.length
            if (eventCount && eventCount > 1) {
                const event = c?.children.item(0)?.children.item(0)?.innerHTML.trim() ?? ""
                const rawEvent = event?.substring(0, event?.indexOf("-") - 1) ?? ""
                return { id: rawEvent ?? "", documents: c?.children.length - 1, isEPROC: true }
            }
            return { id: "", documents: 0, isEPROC: true }
        }))

    } else {
        events.push(...lawsuit.map(c => {
            const eventCount = c?.children.length
            if (eventCount && eventCount > 1) {
                const eventDiv = c?.children.item(1) as HTMLDivElement
                const event = eventDiv.innerText
                const rawEvent = event?.substring(0, event?.indexOf("-") - 1) ?? ""
                return { id: rawEvent ?? "", documents: 1, isEPROC: false }
            }
            return { id: "", documents: 0, isEPROC: false }


        }))

    }

    for (let doc of lawsuit) {
        if (!doc) return
        if (doc.children.length > 2)
            lawsuitDocuments.push(...Array.from(doc.children).slice(1, doc.children.length).flatMap(c => "https://solar.defensoria.mg.def.br" + c.firstElementChild?.getAttribute("value")))
        else
            if (doc.children.length > 1)
                lawsuitDocuments.push("https://solar.defensoria.mg.def.br" + doc.children.item(1)?.children.item(0)?.getAttribute("value"))

    }
    const lawsuitDocs = { documents: lawsuitDocuments.flatMap(c => c).filter(c => c), events: events.filter(c => c.id) }
    return lawsuitDocs
}


async function mergePDF(pdfs: ArrayBuffer[], events: Array<{ id: string, documents: number, isEPROC: boolean }>) {
    const mergedPdf = await PDFDocument.create();
    const loadedPdfs = await Promise.all(
        pdfs.map((pdf) => PDFDocument.load(pdf))
    );
    let i = 0, curDocument = 1, curPage = 1
    const { isEPROC } = events[0]
    for (const [pdfIndex, loadedPdf] of loadedPdfs.entries()) {
        let event = events[pdfIndex];
        let refText = ""
        const copiedPages = await mergedPdf.copyPages(
            loadedPdf,
            loadedPdf.getPageIndices()
        );

        if (events.length > 1) {
            for (let pageIndex = 0; pageIndex < copiedPages.length; pageIndex++) {
                const page = copiedPages[pageIndex];
                if (!isEPROC) {
                    refText = `id. ${event.id} pag ${pageIndex + 1}`
                } else {
                    event = events[i]
                    refText = `Evento. ${event.id} pag ${curPage}`
                    if (event.documents === curDocument && curPage - 1 === copiedPages.length - 1) {
                        curDocument = 0
                        curPage = 1
                        i++
                    } else if (curPage - 1 === copiedPages.length - 1) {
                        curPage++
                        curDocument++
                    } else curPage++

                }
                page.drawText(
                    refText,
                    {
                        x: 10,
                        y: page.getHeight() - 20,
                        size: 8,
                        color: rgb(0.4, 0.6, 0.8)
                    }
                );

                mergedPdf.addPage(page);
            }
        } else {
            copiedPages.forEach(page => mergedPdf.addPage(page))

        }

    }

    const mergedPdfBytes = await mergedPdf.save();
    return mergedPdfBytes;
}


export async function sendToOffscreenProcessor(htmlString: string): Promise<{ content: ArrayBuffer, pages: number }> {
    const result = await sendMessage("RENDER_HTML", htmlString)
    // 1. Cria o documento offscreen se ele já não existir
    if (!result || !result.success) {
        failDownloadToast()
        throw new Error(result?.error || "Erro desconhecido no processamento do background");
    }

    // Reconstrói o ArrayBuffer que veio serializado
    return { content: new Uint8Array(result.data.content).buffer, pages: result.data.pages };
}

function createDownloadToast() {
    if (document.getElementById("download-toast")) return;

    const pageStyle = document.createElement("style")
    pageStyle.textContent = `#download-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 340px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  padding: 16px;
  z-index: 999999;
  font-family: Inter, sans-serif;
  animation: slideIn 0.25s ease-out;
}

#download-toast-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

#download-toast-icon {
  font-size: 18px;
}

#download-toast-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

#download-toast-status {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 10px;
}

#download-toast-progress {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

#download-toast-progress-bar {
  height: 100%;
  width: 0%;
  background: #2563eb;
  border-radius: inherit;
  transition: width 0.2s ease;
}

#download-toast-percent {
  text-align: right;
  margin-top: 6px;
  font-size: 12px;
  color: #4b5563;
}

#download-toast.success #download-toast-progress-bar {
  background: #16a34a;
}

#download-toast.error #download-toast-progress-bar {
  background: #dc2626;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}`

    document.body.insertAdjacentHTML(
        "afterbegin",
        `
    <div id="download-toast">
      <div id="download-toast-header">
        <span id="download-toast-icon">
        <i class='fas fa-download'></i>
        </span>
        <span id="download-toast-title">Download do documento</span>
      </div>

      <div id="download-toast-status">
        Preparando download...
      </div>

      <div id="download-toast-progress">
        <div id="download-toast-progress-bar"></div>
      </div>

      <div id="download-toast-percent">0%</div>
    </div>
  `
    );
    document.body.appendChild(pageStyle)
}


function updateDownloadProgress(percent: number) {
    const bar = document.getElementById("download-toast-progress-bar");
    const label = document.getElementById("download-toast-percent");
    const status = document.getElementById("download-toast-status");

    bar!.style.width = `${percent}%`;
    label!.textContent = `${percent}%`;
    status!.textContent = "Baixando documento...";
}


function finishDownloadToast() {
    const toast = document.getElementById("download-toast");
    if (!toast) return

    toast.classList.add("success");

    const icon = document.getElementById("download-toast-icon")
    if (icon) icon.innerHTML = "<i class='fas fa-check'><i>";
    const status = document.getElementById("download-toast-status")
    if (status) status.innerHTML = "Documento baixado com sucesso";

    const result = document.getElementById("download-toast-percent")
    if (result) result.textContent = "100%";

    setTimeout(() => {
        toast.remove();
    }, 3000);
}


function failDownloadToast() {
    const toast = document.getElementById("download-toast");
    if (!toast) return
    toast.classList.add("error");

    const icon = document.getElementById("download-toast-icon")
    if (icon) icon.innerHTML = "<i class='fas fa-xmark'><i>";
    const status = document.getElementById("download-toast-status")
    if (status) status.innerHTML = "Erro ao baixar o processo";

    setTimeout(() => {
        toast.remove();
    }, 5000);
}