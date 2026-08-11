import { PDFDocument, rgb } from "pdf-lib"
import { sendToOffscreenProcessor } from "../../solar/atendimento/eproc"
import type { Processo, ProcessoQueryResult, Vinculado } from "../../solar/types/lawsuit"
import { concurrentDownload, downloadPDF } from "../../util"
import { createDownloadToast, finishDownloadToast, generateModalStructure, hideLoadingSpinner, jsonToPrompt, showLoadingSpinner, showToast, updateDownloadProgress } from "../utils/ui"
import { getGeminiLawsuitOutput } from "../gemini"
import { getLawsuit, renderModal, sendMessage } from "../utils"
import type { Lawsuits } from "../types/lawsuits"
import prompt from '../../promtps.json'
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
const favoriteDocumentBtn = document.querySelector("#favoriteDocumentBtn") as HTMLButtonElement
const lawsuitDocuments = new Array<{ url: string, date: string, createdBy: string, event: string, docCount: number, isEPROC: boolean }>()
const aiutton = document.querySelector("#aiOptionsButton") as HTMLButtonElement
let savedLawsuit: Partial<Lawsuits> = {}
let maxDocumentCount = 0
let selectedEvent = ""
const viewFavoriteDocumentsButton = document.querySelector("#favoriteDocumentsButton") as HTMLButtonElement




document.addEventListener("DOMContentLoaded", async () => {
    const lawsuitNumber = params.get("numero")
    const isDefendant = params.get("reu")
    if (lawsuitNumber) {
        showLoadingSpinner()
        const caseNumber = `${lawsuitNumber.substring(0, 7)}-${lawsuitNumber.substring(7, 9)}.${lawsuitNumber.substring(9, 13)}.${lawsuitNumber[13]}.${lawsuitNumber.substring(14, 16)}.${lawsuitNumber.substring(16)}`
        document.title = "Processo " + caseNumber
        // lawsuitQueryResult = await getLawsuit(lawsuitNumber)
        const lawsuitAPIResult = getLawsuit(lawsuitNumber)
        const dbLawsuit = sendMessage("GET_LAWSUIT", { number: lawsuitNumber })
        const results = await Promise.all([lawsuitAPIResult, dbLawsuit])
        if (results[0] && results[1]) {
            lawsuitQueryResult = results[0]
            savedLawsuit = results[1].data as Lawsuits
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
                    selectedEvent = curTimelineItem.dataset.eventId ?? ""
                    document.querySelector("#document-protocol-date")!.textContent = curTimelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                    document.querySelector("#document-author")!.textContent = "Protocolado por " + curTimelineItem.dataset.creator
                    favoriteDocument(curTimelineItem.dataset.eventId ?? "")

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
                    selectedEvent = curTimelineItem.dataset.eventId ?? ""
                    showLoadingSpinner()
                    documentViewer.addEventListener("load", () => {
                        hideLoadingSpinner()
                    });
                    const timelineItem = getParent(firstDoc, "timeline-item")
                    if (timelineItem) {
                        document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                        document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator
                        favoriteDocument(timelineItem.dataset.eventId ?? "")

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
                    selectedEvent = curTimelineItem.dataset.eventId ?? ""
                    showLoadingSpinner()
                    documentViewer.addEventListener("load", () => {
                        hideLoadingSpinner()
                    });
                    const timelineItem = getParent(lastDoc, "timeline-item")
                    if (timelineItem) {
                        document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                        document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator
                        favoriteDocument(timelineItem.dataset.eventId ?? "")

                    }

                })


                viewFavoriteDocumentsButton.addEventListener("click", () => {
                    const workspace = document.querySelector(".case-workspace") as HTMLDivElement;
                    workspace.classList.toggle("show-favorites");
                    (document.querySelector(".favorites-panel") as HTMLDivElement).classList.toggle("open")
                })

                favoriteDocumentBtn.addEventListener("click", async () => {
                    const icon = favoriteDocumentBtn.children.item(0) as HTMLDivElement
                    if (savedLawsuit.favoriteEvents?.includes(selectedEvent)) return
                    if (icon.className === "bi bi-star-fill") {
                        const events = savedLawsuit.favoriteEvents
                        if (events) {
                            if (events.length > 1) {
                                const favoriteEvents: string[] = []

                                for (const event of events) {
                                    if (event === selectedEvent) {
                                        savedLawsuit.favoriteEvents = favoriteEvents
                                        const result = await sendMessage("UPDATE_LAWSUITS", { lawsuits: savedLawsuit })
                                        if (result.data) {
                                            showToast("Evento removido dos favoritos com sucesso")
                                            icon.className = "bi bi-star"
                                            renderFavoriteList()
                                            break
                                        }
                                    } else {
                                        favoriteEvents.push(event)
                                    }
                                }
                            } else {
                                savedLawsuit.favoriteEvents = []
                                const result = await sendMessage("UPDATE_LAWSUITS", { lawsuits: savedLawsuit })
                                if (result.data) {
                                    icon.className = "bi bi-star"
                                    showToast("Evento removido dos favoritos com sucesso")
                                    renderFavoriteList()
                                }
                            }
                        }

                    } else {
                        savedLawsuit.favoriteEvents?.push(selectedEvent)
                        const result = await sendMessage("UPDATE_LAWSUITS", { lawsuits: savedLawsuit })
                        if (result.data) {
                            showToast("Evento incluído nos favoritos com sucesso")
                            icon.className = "bi bi-star-fill"
                            renderFavoriteList()
                        }
                    }
                })
                document.querySelectorAll(".summary-card")[4].addEventListener("click", () => {
                    generateModalStructure()
                    renderModal().open({
                        title: "Veja os detalhes do processo",
                        content: `
                          <form id="deadlineForm">
                             <table>
                              <thead>
                                <tr>
                                 <th>Numero</th>
                                 <th>Órgão julgador</th>
                                 <th>Classe</th>
                                 <th>Priodade</th>
                                </tr>
                              </thead>
                            <tbody>
                             <tr>
                              <td>${document.querySelector(".case-number")!.textContent}</td>
                              <td>${document.querySelector("#case-circuit")!.textContent}</td>
                              <td>${document.querySelector(".case-class")!.textContent}</td>
                              <td>${lawsuit.prioridades.map(c => c).join(",") ?? "-"}</td>   
                             </tr>
                            </tbody>
                           </table>

                            <table>
                              <thead>
                                <tr>
                                 <th>Codigo</th>
                                 <th>Descricao</th>
                                 <th>Principal</th>
                                </tr>
                              </thead>
                            <tbody>
                            ${lawsuit.assuntos.map(c => {
                            return `<tr>
                              <td>${c.codigo}</td>
                              <td>${c.nome}</td>
                              <td>${c.principal ? "Sim" : "Não"}</td>
                             </tr>`
                        }).join("")}
                            
                            </tbody>
                           </table>

                           <table>
                              <thead>
                                <tr>
                                <th>Vínculo</th>
                                <th>Numero</th>
                                 <th>Órgão julgador</th>
                                 <th>Classe</th>
                                </tr>
                              </thead>
                            <tbody>
                            ${lawsuit.vinculados.map(c => {
                            return `<tr>
                              <td>${c.vinculo}</td>
                              <td>${c.numero}</td>
                              <td>${c.orgao_julgador?.nome ? c.orgao_julgador?.nome : ""}</td>
                              <td>${c.classe ? c.classe : ""}</td>
                             </tr>`
                        }).join("")}
                            
                            </tbody>
                           </table>

                            <table>
                              <thead>
                                <tr>
                                <th>Nome</th>
                                <th>Sexo</th>
                                 <th>Nascimento</th>
                                 <th>Município</th>
                                 <th>UF</th>
                                </tr>
                              </thead>
                            <tbody>
                            ${lawsuit.partes.map(c => {
                            return `<tr>
                              <td>${c.pessoa.nome} (${c.tipo === "AT" ? "Autor(a)" : "Ré"})</td>
                              <td>${c.pessoa.sexo === "M" ? "Masculino" : c.pessoa.sexo === "F" ? "Feminino" : c.pessoa.sexo === "D" ? "Pessoa Jurídica" : "Informação não fornecida"}</td>
                              <td>${c.pessoa.data_nascimento ? new Date(c.pessoa.data_nascimento).toLocaleString() : ""}</td>
                              <td>${c.pessoa.cidade_natural ? c.pessoa.cidade_natural : ""}</td>
                              <td>${c.pessoa.estado_natural ? c.pessoa.estado_natural : ""}</td>
                             </tr>`
                        }).join("")}
                            
                            </tbody>
                           </table>
                           </form>
                         
                         `,
                        actions: [
                            {
                                label: 'Salvar tarefa', className: 'btn-primary', preventClose: true, callback: () => {
                                    const form = document.querySelector("#deadlineForm") as HTMLFormElement
                                    const formData = new FormData(form)
                                    const rawEarlierDate = formData.get("earlierDate") as string
                                    const rawEndDate = formData.get("endDate") as string
                                    const holidaysChk = formData.get("isHolidays") as string
                                    const isElapsedDays = formData.get("isElapsedDays") as string
                                    console.log(isElapsedDays, holidaysChk, rawEndDate, rawEarlierDate)
                                    //    if (isValidDate(rawEarlierDate) && isValidDate(rawEndDate)) {
                                    //        const earlierDate = convertTextDateToDate(rawEarlierDate)
                                    //        const endDate = convertTextDateToDate(rawEndDate)
                                    //        if (Number(earlierDate) < Number(endDate)) {
                                    //            let dates = { days: 0, deadline: new Date, isDueDate: false }
                                    //            dates = getBusinessDays(earlierDate, endDate, holidaysChk ? holidays : undefined, isElapsedDays ? true : false)
                                    //            document.querySelector("#result")!.innerHTML = "Resultado " + String(dates.days) + " dias."
                                    //        }
                                    //    } else {
                                    //        showToast("Uma das datas está inválida.")
                                    //        return
                                    //    }
                                }
                            }
                        ]
                    })
                })
                nextDocButton.addEventListener("click", () => changeDocuments(true, 1))
                downloadButton.addEventListener("click", async () => await donwloadLawsuit())
                aiutton.addEventListener("click", () => openGeminiPromptsModal())
                renderFavoriteList()
                document.querySelector("#last-document")!.textContent = maxDocumentCount.toString()
                document.querySelector("#current-document")!.textContent = maxDocumentCount.toString()
                hideLoadingSpinner()

            }

        }

    }
})

function openGeminiPromptsModal() {
    generateModalStructure()
    renderModal().open({
        title: "Selecione o prompt",
        content: `
       <form id="promptForm">
          <div class="form-group">
            <label for="promptType">Formato do arquivo</label>
             <select name="prompt" id="promptType">
              <option value="-1">Selecione o seu prompt</option>
              <option value="0">Resumir Processo</option>
              <option value="1">Manifestar sobre a última intimação</option>
              <option value="2">Criar quesitos</option>
              <option value="3">Verificar nulidade de citação.</option>
              <option value="4">Personalizado</option>
             </select>
             </div>
             <input type="checkbox" name="downloadLawsuitFile"/>
            <label for="downloadLawsuitFile">Baixar arquivo</label>
             <div class="form-group">
             <label for="prompText">Escreva seu prompt</label>
                <textarea rows="12" id="promptText" name="promptTextDesc" disabled0></textarea>
             </div>
        </form>
      
      `,
        actions: [
            {
                label: 'Enviar Prompt', className: 'btn-primary', preventClose: true, callback: async () => {
                    const form = document.querySelector("#promptForm") as HTMLFormElement
                    const formData = new FormData(form)
                    const selectedPrompt = formData.get("promptTextDesc") as string
                    const download = formData.get("downloadLawsuitFile") as string
                    await geminiOutput(download === "on", selectedPrompt)

                }
            }
        ]
    })  


    const promptSelect = document.querySelector("#promptType") as HTMLSelectElement
    promptSelect.onchange = () => {
        const i = Number(promptSelect.options.item(promptSelect.options.selectedIndex)?.value!)
        if (i > -1) {
            if (i < 4) {
                const results = jsonToPrompt(prompt.results[i])
                document.querySelector("#promptText")!.innerHTML = results
                const textarea = document.querySelector("#promptText") as HTMLTextAreaElement
                textarea.disabled = true
            } else {
                const textarea = document.querySelector("#promptText") as HTMLTextAreaElement
                textarea.disabled = false
            }

        }
    }
}


function renderFavoriteList() {
    const favoriteList = document.querySelector(".favorites-list") as HTMLDivElement
    favoriteList.innerHTML = savedLawsuit.favoriteEvents?.map(c => {
        const event = document.querySelector(`[data-event-id='${c}']`) as HTMLDivElement
        const title = event.querySelector(".timeline-content > .documents-container > .documents-tree > .tree-wrapper > .tree-node > span") as HTMLSpanElement
        const date = event.querySelector(".timeline-content > .timeline-meta") as HTMLDivElement

        return `<div class="favorite-item" data-event-id=${c}>
                        <div class="favorite-icon">
                            <i class="bi bi-file-earmark"></i>
                        </div>
                        <div class="favorite-info">
                            <div class="favorite-title">
                                ${title.textContent}
                            </div>
                            <div class="favorite-date">
                                ${date.textContent}
                            </div>
                        </div>
                    </div>`
    }).join("") ?? ""
    const items = document.querySelectorAll(".favorite-item") as NodeListOf<HTMLDivElement>
    items.forEach(i => {
        i.onclick = () => {
            const favorite = document.querySelector(`.timeline-item[data-event-id='${i.dataset.eventId}']`) as HTMLDivElement
            const selectedItem = favorite.querySelector(".timeline-content > .documents-container > .documents-tree  > .tree-wrapper > .tree-node > span") as HTMLDivElement
            selectedItem.click()
        }
    })
}


function favoriteDocument(eventId: string) {
    savedLawsuit.favoriteEvents?.forEach((evt) => {
        const icon = favoriteDocumentBtn.children.item(0) as HTMLDivElement
        if (evt === eventId) {
            icon.className = "bi bi-star-fill"
        } else icon.className = "bi bi-star"

    })
}

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
                let isRootDoc = true
                if (event.documentos.length === 0)
                    timelineMetaData.textContent = new Date(event.data_protocolo).toLocaleString()

                for (const doc of event.documentos) {
                    const url = `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/`
                    if (lawsuit.sistema_webservice.includes("EPROC")) {
                        lawsuitDocuments.push({ url, date: new Date(doc.data_protocolo).toLocaleString(), createdBy: event.usuario ?? "Alguém", event: String(event.numero), docCount: 1, isEPROC: true })
                        const elements = createDocumentNode({
                            name: doc.nome,
                            url,
                            type: doc.parametros.rotulo
                        })
                        article.dataset.eventId = String(doc.evento)
                        tree.appendChild(elements)
                        if (isRootDoc) {
                            eventName.textContent += " - " + doc.evento
                            isRootDoc = false
                        }
                    } else {
                        lawsuitDocuments.push({ url, date: new Date(doc.data_protocolo).toLocaleString(), createdBy: event.usuario ?? "Alguém", event: doc.documento, docCount: 1, isEPROC: false })
                        if (doc.vinculados.length > 1) {
                            const linkedDocs = doc.vinculados
                            const elements = createDocumentNode({
                                name: doc.documento + " - " + doc.nome,
                                url,
                                type: doc.parametros.rotulo
                            }, true, linkedDocs)
                            tree.appendChild(elements)
                            let eventsId = ""
                            const linkedCount = doc.vinculados.length
                            for (let i = 0; i < linkedCount; i++) {
                                if (i === linkedCount - 1)
                                    eventsId += doc.vinculados[i].documento;
                                else
                                    eventsId += ", " + doc.vinculados[i].documento
                            }
                            article.dataset.eventId = eventsId
                            break;
                        } else {
                            const elements = createDocumentNode({
                                name: doc.documento + " - " + doc.nome,
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
                isRootDoc = true
                document.querySelector(".timeline-list")?.appendChild(article)
            }

        }
    } catch (error) {
        console.log(error)
    }



}

function createDocumentNode(documento: { name: string, url: string, type?: string, desc?: string, userCreatedBy?: string }, isRoot = false, documentos?: Vinculado[]) {

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
        selectedEvent = curTimelineItem?.dataset.eventId ?? ""

        if (curTimelineItem) {
            Array.from(document.querySelectorAll("[data-url]")).forEach((c, i) => {
                if (c.parentElement?.className.includes("selected")) {
                    currentDocument.textContent = String(document.querySelectorAll("[data-url]").length - i)
                    // const icon = favoriteDocumentBtn.children.item(0) as HTMLDivElement
                    // icon.className = "bi bi-star-fill"
                    favoriteDocumentBtn.dataset.favoriteEvent = curTimelineItem?.dataset.eventId
                    // savedLawsuit.favoriteEvents?.forEach((evt) => {
                    //     if (evt === curTimelineItem?.dataset.eventId) {
                    //         const icon = favoriteDocumentBtn.children.item(0) as HTMLDivElement
                    //         icon.className = "bi bi-star-fill"
                    //         favoriteDocumentBtn.dataset.favoriteEvents = evt
                    //     }
                    // })
                    favoriteDocument(curTimelineItem?.dataset.eventId ?? "")
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
            lawsuitDocuments.push({ url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit?.numero}/documento/${doc.documento}/`, date: new Date(doc.data_protocolo).toLocaleString(), createdBy: documento.userCreatedBy! ?? "Alguém", event: doc.documento, docCount: documentos.length, isEPROC: false })

            children.appendChild(createDocumentNode({ name: doc.documento + " - " + doc.nome, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit?.numero}/documento/${doc.documento}/`, type: "PET" }, false));
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
            favoriteDocument(timelineItem.dataset.eventId ?? "")

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
            favoriteDocument(timelineItem.dataset.eventId ?? "")

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


        if (download) await downloadPDF(pdf, params.get("numero")!)
        const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' });
        return blob


    }

}


async function mergePDF(pdfs: ArrayBuffer[], events: Array<{ event: string, docCount: number, createdBy: string, date: string, isEPROC: boolean }>) {
    const mergedPdf = await PDFDocument.create();
    console.log(events)
    const { isEPROC } = events[0]
    let i = 0, curDocCount = 0
    for (const bytes of pdfs) {
        const pdf = await PDFDocument.load(bytes);
        let refText = ""
        const pages = await mergedPdf.copyPages(
            pdf,
            pdf.getPageIndices()
        );

        pages.forEach((page, j) => {
            if (!isEPROC) {
                refText = `id. ${events[i].event} pag ${j + 1} protocolado por ${events[i].createdBy} ${events[i].date}`
            } else {
                refText = `evento. ${events[i].event} pag ${j + 1} protocolado por ${events[i].createdBy} ${events[i].date}`
            }
            page.drawText(
                refText,
                {
                    x: 10,
                    y: page.getHeight() - 20,
                    size: 8,
                    color: rgb(0.28, 0.131, 0.100)
                }
            );
            mergedPdf.addPage(page)
        });
        curDocCount++
        if (curDocCount === events[i].docCount) {
            curDocCount = 0
            i++
        }
    }


    const mergedPdfBytes = await mergedPdf.save();
    return mergedPdfBytes;
}



async function geminiOutput(donwload: boolean, prompt: string) {
    const blob = await donwloadLawsuit(donwload)
    if (blob) {
        await getGeminiLawsuitOutput(blob, params.get("numero")!, prompt)
        return
    }

    return

}