export function sortEvents() {
    const sortBtn = document.querySelector("#botaoOrdenarProcesso") as HTMLButtonElement
    const events = Array.from(document.querySelectorAll('[ng-repeat="evento in eproc.processo.eventos | orderBy:\'-data_protocolo\'"]')).reverse()
    const documentList = document.querySelectorAll(".span3").item(4)
    documentList.replaceChildren(...events)
    if(sortBtn){
        if(sortBtn.dataset.orderBy === "asc"){
            sortBtn.dataset.orderBy = "desc"
            sortBtn.className = "fas fa-arrow-down"
            sortBtn.textContent = "Ordernar Ascendente"
        }
        else {
            sortBtn.dataset.orderBy = "asc"
            sortBtn.className = "fas fa-arrow-up"
            sortBtn.textContent = "Ordernar Descendente"
        }
    }
}

export async function forceUpdate(lawsuit: string) {
    const response = await fetch("https://solar.defensoria.mg.def.br/procapi/processo/" + lawsuit + "/consultar/?forcar_atualizacao=true")
    if(response.ok) return true
    else return false
}


export function renderSortLawsuitButton(page: Document){
    const downloadButton = page.querySelector("#botaoDocumentoUnificado")
    const parentDiv = downloadButton?.parentElement?.parentElement as HTMLDivElement
    const sortButton = page.createElement("button")
    sortButton.className = "btn btn-secondary"
    sortButton.id = "botaoOrdenarProcesso"
    sortButton.textContent = "Ordernar Ascendente"
    sortButton.dataset.orderBy = "asc"
    sortButton.onclick = sortEvents
    const sortIcon = page.createElement("i")
    sortIcon.className = "fas fa-arrow-up"
    sortButton.append(sortIcon)
    parentDiv.append(sortButton)
    page.body.append(parentDiv)
}