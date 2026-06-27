import { getLawsuitData } from "../../util"
import { forceUpdate } from "../atendimento/eproc"
import type { Processo } from "../types/lawsuit"

export async function renderSolarDownloadButton() {
  const checkboxes = Array.from(document.querySelectorAll("input[type='checkbox']")) as HTMLInputElement[]
  const checkedBoxes = checkboxes.filter(c => c.checked === true)
  if (checkedBoxes.length) {
    const controls = document.querySelectorAll(".pull-right").item(2)
    if (document.querySelector("#downloadLawsuit")) return
    const downloadButton = document.createElement("button")
    downloadButton.className = "btn btn-warning"
    downloadButton.id = "downloadLawsuit"
    const icon = document.createElement("i")
    icon.className = "fas fa-download"
    icon.innerHTML = "Baixar Processos Selecionados"
    downloadButton.appendChild(icon)
    downloadButton.addEventListener("click", async () => {
      for (const url of checkedBoxes) {
        await forceUpdate(url.dataset.processo ?? "")
        const page = window.open(`/processo/identificar/?numero=${url.dataset.processo}&grau=${url.dataset.grau}&cpf=${url.dataset.documento}&download=true`)
        if (!page) return
        page?.addEventListener("load", () => {
          const interval = setInterval(() => {
            const downloadButton = page.document.querySelector("#downloadLawsuit") as HTMLButtonElement
            const events = Array.from(page.document.querySelectorAll('[ng-repeat="evento in eproc.processo.eventos | orderBy:\'-data_protocolo\'"]')) 
            if (downloadButton && events.length) {
              downloadButton.click()
              clearInterval(interval)
            }
          }, 1000)
        })

      }
    })
    controls.appendChild(downloadButton)
  }

}


export async function renderAssistedSide() {
  if (window.location.href.includes("https://solar.defensoria.mg.def.br/processo/intimacao/buscar/")) {
    const table = document.querySelector("table")
    if (table) {
      const rawRows = Array.from(table.rows)
      if (rawRows.length) {
        const headerRow = rawRows[0]
        const rows = rawRows.slice(1)

        const lawsuitsNumber: Promise<Processo | undefined>[] = []
        for (const row of rows) {
          const lawsuit = row.cells[1]?.children.item(2)?.querySelector("a")?.innerText.trim() ?? ""
          if (lawsuit) {
            lawsuitsNumber.push(getLawsuitData(lawsuit.replaceAll(".", "").replaceAll("-", "")))
          }
        }

        const lawsuits = await Promise.all(lawsuitsNumber)
        const th = document.createElement("th")
        th.innerHTML = "Polo"
        const targetTh = headerRow.cells[3]
        headerRow.insertBefore(th, targetTh)
        for (let index = 0; index < lawsuits.length; index++) {
          const currentRow = rows[index]
          const createdCell = document.createElement("td")
          const status = lawsuits[index]?.partes?.find(c => c.pessoa.nome === currentRow.cells[2].innerText)?.tipo === "AT" ? "Ativo" : "Passivo"
          createdCell.innerHTML = status
          const targetTd = currentRow.cells[3]
          currentRow.insertBefore(createdCell, targetTd)
        }
      }
    }
  }
}



