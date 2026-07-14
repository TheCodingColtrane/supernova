import type { Documento, Processo } from "../../solar/types/lawsuit"
const params = new URLSearchParams(window.location.search)
let lawsuit: Processo | undefined
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
let maxDocumentCount = 0


async function getLawsuit(number: string) {
    try {
        const response = await fetch(`https://solar.defensoria.mg.def.br/procapi/processo/${number}/consultar/?forcar_atualizacao=true`)
        if (response.ok) {
            const { processo } = await response.json()
            return processo as Processo
        } else if (response.status === 403) {
            alert("você precisa entrar no solar.")
            return
        } else return

    } catch (error) {
        console.error(error)
        return
    }

}

document.addEventListener("DOMContentLoaded", async () => {
    const lawsuitNumber = params.get("numero")
    const isDefendant = params.get("reu")
    if (lawsuitNumber) {
        const caseNumber = `${lawsuitNumber.substring(0, 7)}-${lawsuitNumber.substring(7, 9)}.${lawsuitNumber.substring(9, 13)}.${lawsuitNumber[13]}.${lawsuitNumber.substring(14, 16)}.${lawsuitNumber.substring(16)}`
        document.title = "Processo " + caseNumber
        lawsuit = await getLawsuit(lawsuitNumber)
        if (lawsuit && isDefendant) {
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
            const curTimelineItem = document.querySelector(".timeline-list timeline-item") as HTMLDivElement
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
            maxDocumentCount = document.querySelectorAll(".timeline-list span").length - 1
            firstDocButton.addEventListener("click", () => {
                const selectedDoc = document.querySelector(".tree-node.selected") as HTMLDivElement
                selectedDoc.className = "tree-node"
                documents.item(documents.length - 1).parentElement!.className = "tree-node selected"
                const firstDoc = documents.item(documents.length - 1) as HTMLSpanElement
                currentDocument.textContent = "1"
                documentViewer.src = firstDoc.dataset.url ?? "about:blank"
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
                currentDocument.textContent = String(documents.length - 1)
                const lastDoc = documents.item(0) as HTMLSpanElement
                documentViewer.src = lastDoc.dataset.url ?? "about:blank"
                const timelineItem = getParent(lastDoc, "timeline-item")
                if (timelineItem) {
                    document.querySelector("#document-protocol-date")!.textContent = timelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                    document.querySelector("#document-author")!.textContent = "Protocolado por " + timelineItem.dataset.creator

                }

            })
            nextDocButton.addEventListener("click", () => changeDocuments(true, 1))




            document.querySelector("#last-document")!.textContent = maxDocumentCount.toString()
            document.querySelector("#current-document")!.textContent = maxDocumentCount.toString()

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
                    if (lawsuit.sistema_webservice.includes("EPROC")) {
                        const elements = createDocumentNode({
                            name: doc.nome,
                            url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/`,
                            type: doc.parametros.rotulo
                        })
                        tree.appendChild(elements)
                    } else {
                        if (event.documentos.length > 1) {
                            const elements = createDocumentNode({
                                name: doc.nome,
                                url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/`,
                                type: doc.parametros.rotulo
                            }, true, event.documentos.slice(1))
                            tree.appendChild(elements)
                            break;
                        } else {
                            const elements = createDocumentNode({
                                name: doc.nome,
                                url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/`,
                                type: doc.parametros.rotulo
                            }, true)
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

function createDocumentNode(documento: { name: string, url: string, type?: string }, isRoot = false, documentos?: Documento[]) {

    const wrapper = document.createElement("div");
    wrapper.className = "tree-wrapper";

    const node = document.createElement("div");
    node.className = "tree-node";

    if (isRoot) node.classList.add("tree-root");

    // node.dataset.id = documento.id;

    node.innerHTML = `
            <i class="bi bi-file-earmark"></i>
            <span data-url="${documento.url}" data-type=${documento.type}>${documento.name}</span>
        `;

    node.addEventListener("click", () => {

        // e.stopPropagation();

        document.querySelectorAll(".tree-node.selected").forEach(x => x.classList.remove("selected"));

        node.classList.add("selected");
        node.onclick = () => {
            const documentViewer = document.querySelector("#document-viewer") as HTMLIFrameElement
            const url = node.children.item(1) as HTMLSpanElement
            document.querySelector("#document-description")!.innerHTML = `<i class="bi bi-file-earmark"></i> ${url.textContent}`
            const curTimelineItem = getParent(node, "timeline-item")
            if (curTimelineItem) {
                document.querySelector("#document-protocol-date")!.textContent = curTimelineItem.children.item(0)?.children.item(1)?.textContent ?? ""
                document.querySelector("#document-author")!.textContent = "Protocolado por " + curTimelineItem.dataset.creator

            }
            documentViewer.src = url.dataset.url ?? "about:blank"
        }

        // if (documento.onClick)
        //     documento.onClick(documento);

    });

    wrapper.appendChild(node);

    if (documentos && documentos.length) {

        const children = document.createElement("div");
        children.className = "tree-children";

        documentos.forEach(doc => {
            children.appendChild(createDocumentNode({ name: doc.nome, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit?.numero}/documento/${doc.documento}/`, type: doc.parametros.rotulo }, false));
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
}