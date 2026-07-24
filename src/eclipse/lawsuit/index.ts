import { PDFDocument } from "pdf-lib"
import { sendToOffscreenProcessor } from "../../solar/atendimento/eproc"
import type { Documento, Processo, ProcessoQueryResult } from "../../solar/types/lawsuit"
import { concurrentDownload, downloadPDF } from "../../util"
import { createDownloadToast, finishDownloadToast, hideLoadingSpinner, showLoadingSpinner, updateDownloadProgress } from "../utils/ui"
import { getGeminiLawsuitOutput } from "../gemini"
import { getLawsuit } from "../utils"
const params = new URLSearchParams(window.location.search)
let lawsuitQueryResult: ProcessoQueryResult | undefined
let lawsuit: Processo
let timelineList: HTMLDivElement | undefined
const timelineSearchInput = document.querySelector("#timeline-search") as HTMLInputElement
const filterButtons = document.querySelectorAll(".filter-chip")
const allMovimentsButton = filterButtons[0] as HTMLButtonElement
const actsButton = filterButtons[1] as HTMLButtonElement
const dispatchButton = filterButtons[2] as HTMLButtonElement
const decisionButton = filterButtons[3] as HTMLButtonElement
const sentenceButton = filterButtons[4] as HTMLButtonElement
const nextDocButton = document.querySelector("#view-next-doc-btn") as HTMLButtonElement
const lastDocButton = document.querySelector("#view-last-doc-btn") as HTMLButtonElement
const prevDocButton = document.querySelector("#view-previous-doc-btn") as HTMLButtonElement
const firstDocButton = document.querySelector("#view-first-doc-btn") as HTMLButtonElement
const currentDocument = document.querySelector("#current-document") as HTMLElement
const documentViewer = document.querySelector("#document-viewer") as HTMLIFrameElement
const downloadButton = document.querySelector("#downloadLawsuitButton") as HTMLButtonElement
const viewDocumentButton = document.querySelector("#viewDocumentBtn") as HTMLButtonElement
const downloadDocumentButtontn = document.querySelector("#downloadDocumentBtn") as HTMLButtonElement
const lawsuitDocuments = new Array<{ url: string, date: string, createdBy: string, event: string, docCount: number, isEPROC: boolean }>()
const aiutton = document.querySelector("#aiOptionsButton") as HTMLButtonElement

let maxDocumentCount = 0




document.addEventListener("DOMContentLoaded", async () => {
    const lawsuitNumber = params.get("numero")
    const isDefendant = params.get("reu")
    if (lawsuitNumber) {
        showLoadingSpinner()
        const caseNumber = `${lawsuitNumber.substring(0, 7)}-${lawsuitNumber.substring(7, 9)}.${lawsuitNumber.substring(9, 13)}.${lawsuitNumber[13]}.${lawsuitNumber.substring(14, 16)}.${lawsuitNumber.substring(16)}`
        document.title = "Processo " + caseNumber
        lawsuitQueryResult = await getLawsuit(lawsuitNumber)
        if (lawsuitQueryResult && lawsuitQueryResult?.sucesso && isDefendant) {
            lawsuit = lawsuitQueryResult.processo
            document.querySelector("#case-circuit")!.textContent = lawsuit.orgao_julgador.nome
            document.querySelector(".case-number")!.textContent = caseNumber
            document.querySelector(".case-class")!.textContent = lawsuit.classe.nome
            document.querySelector("#case-side")!.textContent = isDefendant === "true" ? "Polo ativo" : "Polo passivo"
            const plaintiffs = lawsuit.partes.filter(c => c.tipo === "AT")
            const defendents = lawsuit.partes.filter(c => c.tipo === "PA")
            document.querySelector("#case-plantiffs")!.textContent = plaintiffs.length > 1 ? plaintiffs[0].pessoa.nome + " e outros " + plaintiffs.length : plaintiffs[0].pessoa.nome
            document.querySelector("#case-defendents")!.textContent = defendents.length > 1 ? defendents[0].pessoa.nome + " e outros " + defendents.length : defendents[0].pessoa.nome
            await renderLawsuitViewer()
            const span = document.querySelector(".timeline-list span") as HTMLSpanElement
            const documents = document.querySelectorAll(".timeline-list span")
            document.querySelector("#document-description")!.innerHTML = `<i class="bi bi-file-earmark"></i> ${span.textContent}`
            documentViewer.src = span.dataset.url ?? "about:blank"
            const curTimelineItem = document.querySelector(".timeline-list > .timeline-item") as HTMLDivElement
            if (curTimelineItem) {
                document.querySelector("#document-protocol-date")!.textContent = curTimelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                document.querySelector("#document-author")!.textContent = "Protocolado por " + curTimelineItem.dataset.creator

            }
            span.parentElement!.className = "tree-node selected"
            timelineList = document.querySelector(".timeline-list") as HTMLDivElement
            timelineSearchInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                    filterTimelineList(timelineSearchInput.value)
                }
            })

            allMovimentsButton.addEventListener("click", () => {
                filterTimelineList(timelineSearchInput.value, "ALL")
                handleFilterButtons(allMovimentsButton)
            })

            actsButton.addEventListener("click", () => {
                filterTimelineList(timelineSearchInput.value, "ACTIONS")
                handleFilterButtons(actsButton)

            })

            dispatchButton.addEventListener("click", () => {
                filterTimelineList(timelineSearchInput.value, "DESP")
                handleFilterButtons(dispatchButton)

            })

            sentenceButton.addEventListener("click", () => {
                filterTimelineList(timelineSearchInput.value, "SENT")
                handleFilterButtons(sentenceButton)

            })

            decisionButton.addEventListener("click", () => {
                filterTimelineList(timelineSearchInput.value, "DEC")
                handleFilterButtons(decisionButton)

            })

            viewDocumentButton.addEventListener("click", () => {
                window.open(documentViewer.src)
            })

            downloadDocumentButtontn.addEventListener("click", async () => {
                const resp = await fetch(documentViewer.src)
                if (resp.ok) {
                    const fileBytes = new Uint8Array(await resp.arrayBuffer())
                    await downloadPDF(fileBytes, document.querySelector("#document-description")?.textContent ?? "")

                }
            })

            document.querySelectorAll(".summary-card")[4].addEventListener("click", () => {

            })
            maxDocumentCount = document.querySelectorAll("[data-url]").length
            firstDocButton.addEventListener("click", () => {
                const selectedDoc = document.querySelector(".tree-node.selected") as HTMLDivElement
                selectedDoc.className = "tree-node"
                documents.item(documents.length - 1).parentElement!.className = "tree-node selected"
                const firstDoc = documents.item(documents.length - 1) as HTMLSpanElement
                currentDocument.textContent = "1"
                documentViewer.src = firstDoc.dataset.url ?? "about:blank"
                showLoadingSpinner()
                documentViewer.addEventListener("load", () => {
                    hideLoadingSpinner()
                });
                const timelineItem = getParent(firstDoc, "timeline-item")
                if (timelineItem) {
                    document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                    document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator

                }



            })
            prevDocButton.addEventListener("click", () => changeDocuments(false, 1))
            lastDocButton.addEventListener("click", () => {
                const selectedDoc = document.querySelector(".tree-node.selected") as HTMLDivElement
                selectedDoc.className = "tree-node"
                documents.item(0).parentElement!.className = "tree-node selected"
                currentDocument.textContent = String(documents.length)
                const lastDoc = documents.item(0) as HTMLSpanElement
                documentViewer.src = lastDoc.dataset.url ?? "about:blank"
                showLoadingSpinner()
                documentViewer.addEventListener("load", () => {
                    hideLoadingSpinner()
                });
                const timelineItem = getParent(lastDoc, "timeline-item")
                if (timelineItem) {
                    document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                    document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator

                }

            })
            nextDocButton.addEventListener("click", () => changeDocuments(true, 1))
            downloadButton.addEventListener("click", async () => await donwloadLawsuit())
            aiutton.addEventListener("click", async () => await geminiOutput(false))


            document.querySelector("#last-document")!.textContent = maxDocumentCount.toString()
            document.querySelector("#current-document")!.textContent = maxDocumentCount.toString()
            hideLoadingSpinner()
        }
    }

})

async function renderLawsuitViewer() {
    try {
        if (lawsuit) {
            for (const event of lawsuit.eventos) {
                const article = document.createElement("article")
                article.className = "timeline-item"
                article.dataset.creator = event.usuario ?? "alguém"
                const timelineMetaData = document.createElement("div")
                timelineMetaData.className = "timeline-meta"
                const tree = document.createElement("div");
                tree.className = "documents-tree";
                const timelineContent = document.createElement("div")
                const eventName = document.createElement("h3")
                eventName.textContent = event.descricao
                timelineContent.appendChild(eventName)
                timelineContent.appendChild(timelineMetaData)
                timelineContent.className = "timeline-content"
                if (event.documentos.length === 0)
                    timelineMetaData.textContent = new Date(event.data_protocolo).toLocaleString()

                for (const doc of event.documentos) {
                    const url = `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/`
                    if (lawsuit.sistema_webservice.includes("EPROC")) {
                        lawsuitDocuments.push({ url, date: doc.data_protocolo.toLocaleString(), createdBy: event.usuario ?? "Alguém", event: String(event.numero), docCount: 1, isEPROC: true })
                        const elements = createDocumentNode({
                            name: doc.nome,
                            url,
                            type: doc.parametros.rotulo
                        })
                        article.dataset.eventId = String(doc.evento)
                        tree.appendChild(elements)
                        eventName.textContent += " - " + doc.evento
                    } else {
                        lawsuitDocuments.push({ url, date: doc.data_protocolo.toLocaleString(), createdBy: event.usuario ?? "Alguém", event: doc.documento, docCount: 1, isEPROC: false })
                        if (event.documentos.length > 1) {
                            const docsSlice = event.documentos.slice(1)
                            const elements = createDocumentNode({
                                name: doc.nome,
                                url,
                                type: doc.parametros.rotulo
                            }, true, docsSlice)
                            tree.appendChild(elements)
                            article.dataset.eventId = docsSlice.reduce((prev, cur) => prev + ", " + cur, "")
                            break;
                        } else {
                            const elements = createDocumentNode({
                                name: doc.nome + " - " + doc.documento,
                                url,
                                type: doc.parametros.rotulo
                            }, true)
                            article.dataset.eventId = String(doc.documento)
                            tree.appendChild(elements)
                        }
                    }
                    timelineMetaData.textContent = new Date(doc.data_protocolo).toLocaleString()
                }
                const docTree = document.createElement("div")
                docTree.className = "documents-container"
                docTree.appendChild(tree)
                timelineContent.appendChild(docTree)
                article.appendChild(timelineContent)
                document.querySelector(".timeline-list")?.appendChild(article)
            }

        }
    } catch (error) {
        console.log(error)
    }



}

function createDocumentNode(documento: { name: string, url: string, type?: string, desc?: string, userCreatedBy?: string }, isRoot = false, documentos?: Documento[]) {

    const wrapper = document.createElement("div");
    wrapper.className = "tree-wrapper";

    const node = document.createElement("div");
    node.className = "tree-node";

    if (isRoot) node.classList.add("tree-root");

    node.innerHTML = `
            <i class="bi bi-file-earmark"></i>
            <span data-url="${documento.url}" data-type=${documento.type ?? "PET"} >${documento.name}</span>
        `;

    node.addEventListener("click", () => {
        document.querySelectorAll(".tree-node.selected").forEach(x => x.classList.remove("selected"));
        node.classList.add("selected");
        const documentViewer = document.querySelector("#document-viewer") as HTMLIFrameElement
        const url = node.children.item(1) as HTMLSpanElement
        document.querySelector("#document-description")!.innerHTML = `<i class="bi bi-file-earmark"></i> ${url.textContent}`
        const curTimelineItem = getParent(node, "timeline-item")
        if (curTimelineItem) {
            Array.from(document.querySelectorAll("[data-url]")).forEach((c, i) => {
                if (c.parentElement?.className.includes("selected")) {
                    currentDocument.textContent = String(document.querySelectorAll("[data-url]").length - i)
                }
            })
            document.querySelector("#document-protocol-date")!.textContent = curTimelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
            document.querySelector("#document-author")!.textContent = "Protocolado por " + curTimelineItem.dataset.creator

        }
        documentViewer.src = url.dataset.url ?? "about:blank"
        showLoadingSpinner()

        documentViewer.addEventListener("load", () => {
            hideLoadingSpinner()
        });
        // }

        // if (documento.onClick)
        //     documento.onClick(documento);

    });

    wrapper.appendChild(node);

    if (documentos && documentos.length) {

        const children = document.createElement("div");
        children.className = "tree-children";

        documentos.forEach(doc => {
            lawsuitDocuments.push({ url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit?.numero}/documento/${doc.documento}/`, date: doc.data_protocolo.toLocaleString(), createdBy: documento.userCreatedBy! ?? "Alguém", event: doc.documento, docCount: documentos.length, isEPROC: false })

            children.appendChild(createDocumentNode({ name: doc.nome + " - " + doc.documento, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit?.numero}/documento/${doc.documento}/`, type: doc.parametros.rotulo }, false));
        });

        wrapper.appendChild(children);

    }

    return wrapper;

}


function filterTimelineList(term: string, type?: string) {
    if (!timelineList) return;

    const search = term.trim().toUpperCase()

    let found = false;

    Array.from(timelineList.children).forEach(item => {
        const timelineItem = item as HTMLDivElement
        let match = false
        if (term) {
            match = Array.from(timelineItem.querySelectorAll("span")).some(span => span.textContent?.toUpperCase().includes(search))
                || timelineItem.dataset.eventId?.includes(term)!
        } else if (type === "DESP") {
            match = Array.from(timelineItem.querySelectorAll("span")).some(dispatch => dispatch.dataset.type?.includes("DESP"))
        } else if (type === "DEC") {
            match = Array.from(timelineItem.querySelectorAll("span")).some(decision => decision.dataset.type?.includes("DEC"))
        } else if (type === "SENT") {
            match = Array.from(timelineItem.querySelectorAll("span")).some(sentence => sentence.dataset.type?.includes("SENT"))
        } else if (type === "ALL") {
            match = Array.from(timelineItem.querySelectorAll("span")).some(all => all.dataset.type !== "")
        } else {
            match = Array.from(timelineItem.querySelectorAll("span")).some(action =>
                !action.dataset.type?.includes("SENT")
                && !action.dataset.type?.includes("DEC")
                && !action.dataset.type?.includes("DESP"))
        }

        if (type === "ALL" && term !== "")
            timelineItem.style.display = search === "" || match ? "" : "none"
        else
            timelineItem.style.display = match ? "" : "none"


        if (match) found = true;
    })

    const emptyMessage = document.querySelector("#timeline-empty");

    if (!found && search !== "") {
        if (!emptyMessage) {
            const div = document.createElement("div");
            div.id = "timeline-empty";
            div.className = "timeline-item";

            const title = document.createElement("h3");
            title.textContent = "Nenhum documento encontrado com estes termos";

            div.appendChild(title);
            timelineList.appendChild(div);
        }
    } else {
        emptyMessage?.remove();
    }
}

function handleFilterButtons(clickedFilterButton: HTMLButtonElement) {
    for (const button of filterButtons) {
        if (button.className.includes("active")) {
            button.className = "filter-chip"
            clickedFilterButton.className += " active"
            break;
        }

    }
}

function getParent(element: HTMLElement, selectedParent: string) {
    let currentParent: HTMLElement
    while (element) {
        if (element.parentElement) {
            currentParent = element.parentElement
            if (currentParent.className === selectedParent) return currentParent
            else element = element.parentElement
        }

    }
}

function changeDocuments(forward: boolean, count: number) {
    if (!count) count = maxDocumentCount
    let curDocCount = 0, selectedCurrentDoc = Number(currentDocument?.textContent)
    if (forward) curDocCount = maxDocumentCount - (selectedCurrentDoc + count)
    else curDocCount = maxDocumentCount - (selectedCurrentDoc - count)
    if (curDocCount < 0 || curDocCount > maxDocumentCount) return
    const documents = document.querySelectorAll(".timeline-list span")
    const selectedDocument = documents.item(curDocCount) as HTMLSpanElement
    const lastDocument = Number(document.querySelector("#last-document")?.textContent)
    const previuoslySelectedElement = documents.item(forward ? curDocCount + count : curDocCount - count)

    if (selectedCurrentDoc === lastDocument) {
        currentDocument!.textContent = !forward ? String(lastDocument - count === 0 ? 1 : lastDocument - count) : String(lastDocument + count)
        previuoslySelectedElement.parentElement!.className = "tree-node"
        selectedDocument.parentElement!.className = "tree-node selected"
        const timelineItem = getParent(selectedDocument, "timeline-item")
        if (timelineItem) {
            document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
            document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator

        }

    }
    else {
        currentDocument!.textContent = !forward ? String(selectedCurrentDoc - count === 0 ? 1 : selectedCurrentDoc - count) : String(selectedCurrentDoc + count)
        previuoslySelectedElement.parentElement!.className = "tree-node"
        selectedDocument.parentElement!.className = "tree-node selected"
        const timelineItem = getParent(selectedDocument, "timeline-item")
        if (timelineItem) {
            document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
            document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator

        }
    }

    documentViewer.src = selectedDocument.dataset.url ?? "about:blank"
    showLoadingSpinner()
    documentViewer.addEventListener("load", () => {
        hideLoadingSpinner()
    });
}

async function donwloadLawsuit(download = true) {
    const urls = Array.from(document.querySelectorAll("[data-url]") as NodeListOf<HTMLSpanElement>).map(c => c.dataset.url!)
    const rawDocuments = new Array(urls.length)
    let completedDownloads = 0
    if (urls.length > 0) {
        createDownloadToast()
        await concurrentDownload(
            urls,
            10,
            async (url: string, i: number) => {
                console.log(url, i)
                const res = await fetch(url)
                const headers = res.headers
                console.log(headers.get("Content-Type"))
                const isHtml = headers.get("Content-Type")?.includes("text/html")
                if (isHtml) {
                    const isUTF8 = headers.get("Content-Type") === "text/html; charset=utf-8"
                    const buffer = await res.arrayBuffer();
                    const htmlText = new TextDecoder(isUTF8 ? "utf-8" : "iso-8859-1").decode(buffer);
                    const result = await sendToOffscreenProcessor(htmlText)
                    rawDocuments[i] = result.content

                } else if (headers.get("Content-Type") === "application/pdf")
                    rawDocuments[i] = await res.arrayBuffer()
                completedDownloads++
                updateDownloadProgress(Math.round(completedDownloads / urls.length * 100))

            }

        )
        const pdf = await mergePDF(rawDocuments, lawsuitDocuments)
        finishDownloadToast()

        if (download) {
            await downloadPDF(pdf, params.get("numero")!)
        } else {
            const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' });
            return blob
        }

    }

}


async function mergePDF(pdfs: ArrayBuffer[], events: Array<{ event: string, docCount: number, createdBy: string, date: string, isEPROC: boolean }>) {
    const mergedPdf = await PDFDocument.create();
    console.log(events)
    for (const bytes of pdfs) {
        const pdf = await PDFDocument.load(bytes);

        const pages = await mergedPdf.copyPages(
            pdf,
            pdf.getPageIndices()
        );

        pages.forEach((page) => mergedPdf.addPage(page));

    }


    const mergedPdfBytes = await mergedPdf.save();
    return mergedPdfBytes;
}



async function geminiOutput(donwload = false, prompt = "") {
    const blob = await donwloadLawsuit(donwload)
    if (blob) {
        prompt = "Você é um defensor público com 15 anos de experiência em direito civil. Faça o resumo deste processo de forma detalhada."
        await getGeminiLawsuitOutput(blob, params.get("numero")!, prompt)
        return
    }

    return

}