import { formatISO } from "../../../node_modules/date-fns/formatISO";
import type { Holidays, HolidaysAPIResponse } from "../types/holidays";
import type { Lawsuits } from "../types/lawsuits"
import { getHolidaysAPI, sendMessage } from "../utils"
import { getBusinessDays, localDateToIsoDate } from "../utils/date";

function showAlert(message: string, type = 'success', duration = 4000) {
  const container = document.querySelector('#toastContainer');

  // Cria o elemento do toast
  const toast = document.createElement('div');
  toast.classList.add('toast', type);

  // Define o ícone ou conteúdo (opcional: pode adicionar ícones aqui)
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; cursor:pointer; font-size:1.2rem; margin-left:10px; color:var(--text-muted)">&times;</button>
  `;

  // Botão de fechar manual
  const toastButton = toast.querySelector('button') as HTMLButtonElement
  toastButton.onclick = () => removeToast(toast);
  container?.appendChild(toast);
  // Auto-remover após o tempo definido
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast: HTMLElement) {
  toast.classList.add('hiding');
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}

function getDeadlineClass(days: number) {
  if (days <= 0) return "deadline-danger";
  if (days <= 3) return "deadline-warning";
  return "deadline-ok";
}

function getStatusClass(status: string) {
  if (status === "late") return "status-late";
  if (status === "closed") return "status-closed";
  return "status-open";
}

const activeFilters = { circuit: "", status: "", side: "", assignedTo: "" };
let lawsuitsData = Array<Lawsuits>();
let holidaysData = Array<Holidays>();

let circuits = new Set("");

(async function () {
  try {
    const lawsuits = sendMessage("GET_PENDING_LAWSUITS", {}) as any
    const holidays = sendMessage("GET_HOLIDAYS", {}) as any
    const results = await Promise.all([lawsuits, holidays])
    holidaysData = results[1].data as Holidays[]
    lawsuitsData = results[0].data as Lawsuits[]

    lawsuitsData.map(c => {
      if (!circuits.has(c.circuit)) {
        circuits.add(c.circuit)
      }
    })
    const select = document.querySelector("#filterCircuit") as HTMLSelectElement

    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      select.options.add(opt)
      // select!.appendChild(select!);
    })

    sessionStorage.setItem("lawsuits", JSON.stringify(lawsuitsData))
  } catch (error) {
    console.log(error)
  }


}())

async function getSolarLawsuit(number: string) {
  const response = await fetch("https://solar.defensoria.mg.def.br/processo/52181937920238130024/get/json/?grau=1")
  if (response.status === 200) {
    const result = await response.json()
  }

  else if (response.status === 401) {
    alert("Você precisa logar no solar.")
  }

}


function closePanel() {
  document.querySelector('#sidePanel')?.classList.remove('open');
  document.querySelector('#overlay')?.classList.remove('active');
}

async function updateLawsuit(lawsuits: Lawsuits) {
  await sendMessage("UPDATE_LAWSUITS", { lawsuits })
}

async function deleteLawsuit(id: number) {
  await sendMessage("DELETE_LAWSUITS", { ids: id })

}
// Abre o painel e preenche com os dados da linha
function openPanel(id: number) {

  const data = [...lawsuitsData].find(c => c.id === id)
  if (data) {

    const number = document.querySelector('#editNumber') as HTMLInputElement
    number.value = data.number;
    const assisted = document.querySelector('#editAssisted') as HTMLInputElement
    assisted.value = data.assisted;
    const circuit = document.querySelector('#editCircuit') as HTMLSelectElement
    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      circuit.options.add(opt)
      if (data.circuit === c) opt.selected = true
    })
    const status = document.querySelector('#editStatus') as HTMLSelectElement
    if (data.status === "Aberto") status.selectedIndex = 0
    else status.selectedIndex = 1
    const side = document.querySelector('#editSide') as HTMLSelectElement
    if (data.isDefendant) side.selectedIndex = 1
    else side.selectedIndex = 0
    const awareness = document.querySelector('#editAwarenessDate') as HTMLSelectElement
    awareness.value = !data.awarenessDate ? "" : new Date(data.awarenessDate).toLocaleDateString()
    const startDeadline = document.querySelector('#editStartDeadline') as HTMLSelectElement
    startDeadline.value = !data.initialDeadline ? "" : new Date(data.initialDeadline).toLocaleDateString()
    const endDeadline = document.querySelector('#editEndDeadline') as HTMLSelectElement
    endDeadline.value = !data.deadline ? "" : new Date(data.deadline).toLocaleDateString()
    document.querySelector('#sidePanel')?.classList.add('open');
    document.querySelector('#overlay')?.classList.add('active');
    document.querySelector(".btn-close")?.addEventListener("click", () => {
      closePanel()
    })
    document.querySelector(".btn-save")?.addEventListener("click", async () => {
      const form = document.querySelector("#editForm") as HTMLFormElement
      const formData = Object.fromEntries(new FormData(form))
      let awarenessDate = formData["awarenessDate"] as string
      if (awarenessDate) awarenessDate = localDateToIsoDate(awarenessDate!, false)
      let initialDeadline = formData["initialDeadline"] as string
      if (initialDeadline) initialDeadline = localDateToIsoDate(initialDeadline!, false)
      let deadline = formData["deadline"] as string
      if (deadline) deadline = localDateToIsoDate(deadline!, false)

      const lawsuit: Lawsuits = {
        assisted: formData["assisted"] as string,
        awarenessDate,
        circuit: formData["circuit"] as string,
        deadline,
        defender: data.defender,
        givenDeadLine: data.givenDeadLine,
        initialDeadline,
        isDefendant: formData["isDefendant"]?.toString() === "0" ? true : false,
        number: formData["number"] as string,
        source: data.source,
        status: formData["status"]?.toString() === "0" ? "Aguardando Abertura" : "Aberto",
        id: id
      }
      await updateLawsuit(lawsuit)
      showAlert("Processo atualizado com sucesso.", "success")
      const i = lawsuitsData.findIndex(c => c.id === id)
      lawsuitsData[i] = {...lawsuit}
      closePanel()
      renderTableWithOptions()
    })

    document.querySelector(".btn-delete")?.addEventListener("click", async () => {
      await deleteLawsuit(id)
      showAlert("Processo deletado com sucesso.", "success")
       const idx = lawsuitsData.findIndex(c => c.id === id)
      lawsuitsData = lawsuitsData.splice(idx, 1)
      closePanel()
      renderTableWithOptions()
    })
  }

}


// Exemplo de como anexar o evento no clique da linha (dentro do seu loop de renderização da tabela)
// row.onclick = () => openPanel(processo);


function changeSortOrder(propName: string, prop: keyof Lawsuits, sortOrder: string) {
  const props = { "number": "", "circuit": "", "assisted": "", "status": "", "isDefendant": "", "deadline": "" };

  if (sortOrder === "" || sortOrder === "desc") sortOrder = "asc"
  else sortOrder = "desc"

  const ths = Array.from(document.querySelectorAll("thead th"))
  for (const th of ths) {
    const curTh = th as HTMLElement
    if (curTh.dataset.nm !== propName) {
      curTh.dataset.sort = ""
    } else curTh.dataset.sort = sortOrder
  }

  const b64Text = btoa(propName + "," + sortOrder)
  const url = new URLSearchParams(window.location.search)
  url.set("key", b64Text)
  window.history.pushState(null, '', url.toString())
  const data = JSON.parse(sessionStorage.getItem("lawsuits")!) as Lawsuits[]

  const sortedLawsuits = sortTable(data, prop, sortOrder)
  renderTable(sortedLawsuits)
  // sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
}


function sortTable<Lawsuits>(arr: Lawsuits[], property: keyof Lawsuits, order: string): Lawsuits[] {
  return [...arr].sort((a, b) => {
    const valA = a[property];
    const valB = b[property];

    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });
}
async function renderTable(data: Lawsuits[], holidays?: Holidays[], isElapsedDays = false) {
  const table = document.getElementById("processTable");
  table?.replaceChildren()
  table!.innerHTML = "";

  data.forEach((p: Lawsuits) => {
    let dates = { days: 0, deadline: new Date, isDueDate: false }
    if (p.initialDeadline && p.deadline) {
      const dateComponents = p.deadline.toString().split("-")
      dates = getBusinessDays(new Date(), new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2])), holidays, isElapsedDays)
    }


    const tr = document.createElement("tr");
    tr.dataset.id = p.id?.toString()
    tr.innerHTML = `
        <td>${p.number}</td>
        <td>${p.circuit}</td>
        <td>${p.assisted}</td>
        <td><span class="badge ${getStatusClass(p.status)}">${p.status}</span></td>
        <td>${p.isDefendant ? "Passivo" : "Ativo"}</td>
        <td>${!p.deadline ? "Não definido" : new Date(dates.deadline).toLocaleDateString()}</td>
        <td class="${getDeadlineClass(dates.days)}">
          ${dates.isDueDate ? "Prazo Perdido" : dates.days}
        </td>
        <td>${Array.isArray(p.defender) ? "Defensores da vara" : p.defender.nome}</td>
      `;
    tr.addEventListener("click", () => {
      if (p.id) openPanel(p.id)
    })

    //   tr.onclick = () => alert("Abrir processo: " + p.number);

    table!.appendChild(tr);
  })
}

function renderTableWithOptions() {
  const isElapsedDays = document.querySelector("#checkCalendarDays") as HTMLInputElement
  const isHolidays = document.querySelector("#checkHolidays") as HTMLInputElement
  renderTable(lawsuitsData, isHolidays.checked ? holidaysData : [], isElapsedDays.checked)
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { data } = await sendMessage("GET_PENDING_LAWSUITS", {}) as any
    if (data) {
      sessionStorage.setItem("lawsuits", JSON.stringify(data))
      renderTable(data)
      const ths = Array.from(document.querySelectorAll("thead th"))
      for (const th of ths) {
        th.addEventListener("click", (e) => {
          const curTh = th as HTMLElement
          switch (curTh.dataset.nm) {
            case "number":
              changeSortOrder(curTh.dataset.nm!, "number", curTh.dataset.sort!)
              break
            case "circuit":
              changeSortOrder(curTh.dataset.nm!, "circuit", curTh.dataset.sort!)
              break
            case "assisted":
              changeSortOrder(curTh.dataset.nm!, "assisted", curTh.dataset.sort!)
              break
            case "status":
              changeSortOrder(curTh.dataset.nm!, "status", curTh.dataset.sort!)
              break
            case "side":
              changeSortOrder(curTh.dataset.nm!, "isDefendant", curTh.dataset.sort!)
              break
            case "deadline":
              changeSortOrder(curTh.dataset.nm!, "deadline", curTh.dataset.sort!)
              break
            case "daysLeft":
              changeSortOrder(curTh.dataset.nm!, "daysLeft", curTh.dataset.sort!)
              break
          }
        })

        const searchField = document.querySelector("#search")!
        searchField.addEventListener("keydown", (e) => {
          const input = searchField as HTMLInputElement
          searchLawsuits(input.value)
        })

        const lawsuits = data as Lawsuits[]
        const today = formatISO(new Date(), { representation: 'date' })
        document.querySelector("#todayCount")!.innerHTML = lawsuits.filter(c => c.deadline === today).length.toString()
        document.querySelector("#weekCount")!.innerHTML = lawsuits.length.toString()
        document.querySelector("#activeCount")!.innerHTML = lawsuits.length.toString()


        document.querySelector("#checkHolidays")?.addEventListener("change", (e) => {
          if (holidaysData) {
            const isElapsedDays = document.querySelector("#checkCalendarDays") as HTMLInputElement
            const input = e.target as HTMLInputElement
            renderTable(lawsuits, input.checked ? holidaysData : [], isElapsedDays.checked)
          }

        })

        document.querySelector("#checkCalendarDays")?.addEventListener("change", (e) => {
          if (holidaysData) {
            const isElapsedDaysInput = e.target as HTMLInputElement
            const checkHolidaysInput = document.querySelector("#checkHolidays") as HTMLInputElement
            return renderTable(data, checkHolidaysInput.checked ? holidaysData : [], isElapsedDaysInput.checked)
          }
        })
      }
    }
  } catch (error) {
    console.error(error)
  }
})

document.querySelector("#filterCircuit")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todas") {
    activeFilters.circuit = ""
    searchLawsuits(search.value)
  } else {
    activeFilters.circuit = select.selectedOptions.item(0)?.textContent!
    searchLawsuits(search.value)
  }
})

document.querySelector("#filterStatus")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.status = ""
    searchLawsuits(search.value)
  } else {
    activeFilters.status = select.selectedOptions.item(0)?.textContent!
    searchLawsuits(search.value)
  }
})

document.querySelector("#filterSide")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.side = ""
    searchLawsuits(search.value)
  } else {
    activeFilters.side = select.selectedOptions.item(0)?.textContent!
    searchLawsuits(search.value)
  }
})

document.querySelector("#filterAssignedTo")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.assignedTo = ""
    searchLawsuits(search.value)
  } else {
    activeFilters.assignedTo = select.selectedOptions.item(0)?.textContent!
    searchLawsuits(search.value)
  }
})


function updateCards(data: Lawsuits[]) {
  const today = formatISO(new Date(), { representation: 'date' });

  document.querySelector("#todayCount")!.innerHTML =
    data.filter(c => c.deadline === today).length.toString();

  document.querySelector("#weekCount")!.innerHTML =
    data.length.toString();

  document.querySelector("#activeCount")!.innerHTML =
    data.filter(c => c.status === "aberto").length.toString();

  // document.querySelector("#doneCount")!.innerHTML =
  //   data.filter(c => c.status === "closed").length.toString();
}

function searchLawsuits(term: string) {
  const data = JSON.parse(sessionStorage.getItem("lawsuits")!) as Lawsuits[];

  let filtered = [...data];

  if (activeFilters.circuit) filtered = filtered.filter(l => l.circuit === activeFilters.circuit);
  if (activeFilters.status !== "") filtered = filtered.filter(l => String(l.status) === activeFilters.status);


  if (activeFilters.side) {
    const isDefendant = activeFilters.side === "Passivo";
    filtered = filtered.filter(l => l.isDefendant === isDefendant);
  }

  if (activeFilters.assignedTo) {
    filtered = filtered.filter(l => Array.isArray(l.defender) ? false : l.defender?.nome === activeFilters.assignedTo
    );
  }

  if (term) {
    filtered = filtered.filter(c =>
      c.assisted.toUpperCase().includes(term.toUpperCase()) ||
      c.number.includes(term)
    );
  }
  updateCards(filtered)
  renderTable(filtered);
}

