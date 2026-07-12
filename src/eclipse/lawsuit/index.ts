import type { Documento, Processo } from "../../solar/types/lawsuit"
const params = new URLSearchParams(window.location.search)
let lawsuit: Processo | undefined
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
        document.title = "Processo " + lawsuitNumber
        lawsuit = await getLawsuit(lawsuitNumber)
        if(lawsuit && isDefendant){        
            document.querySelector("#case-circuit")!.textContent = lawsuit.orgao_julgador.nome
            document.querySelector(".case-number")!.textContent = lawsuit.numero
            document.querySelector(".case-class")!.textContent = lawsuit.classe.nome
            document.querySelector("#case-side")!.textContent = isDefendant === "true" ? "Polo ativo" : "Polo passivo"
            const plaintiffs = lawsuit.partes.filter(c => c.tipo === "AT")
            const defendents = lawsuit.partes.filter(c => c.tipo === "PA")
            document.querySelector("#case-plantiffs")!.textContent =  plaintiffs.length > 1 ? plaintiffs[0].pessoa.nome + "outros " + plaintiffs.length : plaintiffs[0].pessoa.nome
            document.querySelector("#case-defendents")!.textContent =  defendents.length > 1 ? defendents[0].pessoa.nome + "outros " + defendents.length : defendents[0].pessoa.nome
            await renderLawsuitViewer()
            const span = document.querySelector(".timeline-list span") as HTMLSpanElement
            const documentViewer = document.querySelector("#document-viewer") as HTMLIFrameElement
            document.querySelector("#document-description")!.textContent = span.textContent  
            documentViewer.src =  span.dataset.url ?? "about:blank"
            span.parentElement!.className = "tree-node selected"
        }
    }

})

async function renderLawsuitViewer() {
    try {
    // const lawsuitEvent = new Array<{name: string, number: number, documents?: Array<{name: string, url: string}>}>
    if (lawsuit) {
        // let i = 0
        for (const event of lawsuit.eventos) {
            const article = document.createElement("article")
            article.className = "timeline-item"
            const tree = document.createElement("div");
            tree.className = "documents-tree";
            const timelineContent = document.createElement("div")
            const eventName = document.createElement("h3")
            eventName.textContent = event.descricao
            timelineContent.appendChild(eventName)
            timelineContent.className = "timeline-content"
            // lawsuitEvent.push({name: event.descricao, number: event.numero})
            for (const doc of event.documentos) {
                if (lawsuit.sistema_webservice.includes("EPROC")) {
                    const elements = createDocumentNode({ name: doc.nome, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/` })
                    tree.appendChild(elements)
                } else {
                    if (event.documentos.length > 1) {
                        const elements = createDocumentNode({ name: doc.nome, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/` }, true, event.documentos.slice(1))
                         tree.appendChild(elements)
                        break;
                    } else {
                        const elements = createDocumentNode({ name: doc.nome, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit.numero}/documento/${doc.documento}/` }, true)
                         tree.appendChild(elements)
                    }
                }
                // const eventURL = document.createElement("span")
                // eventURL.textContent = doc.nome
                // eventURL.dataset.url =
                //     timelineContent.appendChild(eventURL)
                // lawsuitEvent[i].documents?.push({name: doc.nome, url: `https://solar/${lawsuit.numero}/documento/${doc.documento}/`})
            }
            const docTree = document.createElement("div")
            docTree.className = "documents-container"
            docTree.appendChild(tree)
            timelineContent.appendChild(docTree)
            article.appendChild(timelineContent)
            // article.appendChild(docTree)
            document.querySelector(".timeline-list")?.appendChild(article)
        }

    }
    } catch (error) {
        console.log(error)
    }
    


}

// function renderEvents() {
//     this.container.innerHTML = "";

//     const tree = document.createElement("div");
//     tree.className = "documents-tree";

//     lawsuit.forEach(item => {
//         tree.appendChild(this.createNode(item, true));
//     });

//     this.container.appendChild(tree);
// }

function createDocumentNode(documento: { name: string, url: string }, isRoot = false, documentos?: Documento[]) {

    const wrapper = document.createElement("div");
    wrapper.className = "tree-wrapper";

    const node = document.createElement("div");
    node.className = "tree-node";

    if (isRoot)
        node.classList.add("tree-root");

    // node.dataset.id = documento.id;

    node.innerHTML = `
            <i class="bi bi-file-earmark"></i>
            <span data-url="${documento.url}">${documento.name}</span>
        `;

    node.addEventListener("click", () => {

        // e.stopPropagation();

        document
            .querySelectorAll(".tree-node.selected")
            .forEach(x => x.classList.remove("selected"));

        node.classList.add("selected");
        node.onclick = () => {
            const documentViewer = document.querySelector("#document-viewer") as HTMLIFrameElement
            console.log(node)
            const url = node.children.item(1) as HTMLSpanElement
            document.querySelector("#document-description")!.textContent = url.textContent  
            documentViewer.src =  url.dataset.url ?? "about:blank"
        }

        // if (documento.onClick)
        //     documento.onClick(documento);

    });

    wrapper.appendChild(node);

    if (documentos && documentos.length) {

        const children = document.createElement("div");
        children.className = "tree-children";

        documentos.forEach(doc => {
            children.appendChild(createDocumentNode({ name: doc.nome, url: `https://solar.defensoria.mg.def.br/procapi/processo/${lawsuit?.numero}/documento/${doc.documento}/` }, false));
        });

        wrapper.appendChild(children);

    }

    return wrapper;

}


