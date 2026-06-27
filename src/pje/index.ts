export function sortEvents() {
    const events = Array.from(document.querySelectorAll('[ng-repeat="evento in eproc.processo.eventos | orderBy:\'-data_protocolo\'"]')).reverse()
    const documentList = document.querySelectorAll(".span3").item(4)
    documentList.replaceChildren(...events)
}


//https://solar.defensoria.mg.def.br/procapi/processo/500116349202281300241/consultar/?forcar_atualizacao=true
