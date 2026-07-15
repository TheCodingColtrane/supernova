import { differenceInHours } from "date-fns/differenceInHours";
import { formatISO } from "date-fns/formatISO";
import type { Defenders } from "../types/office";
import type { Holidays } from "../types/holidays";
import type { Worker } from "../types/workers";
import type { Lawsuits } from "../types/lawsuits"
import type { Tasks } from "../types/tasks";
import { getDefenders, getUserCredentials, getWorkers, renderModal, sendMessage } from "../utils"
import { getBusinessDays, localDateToIsoDate } from "../utils/date";
import { getDefensories, updateLawsuitDashboard } from "../service/fetcher";
import { showToast } from "../utils/ui";
import { addBusinessDays } from "date-fns";
const updateLawsuitsBtn = document.querySelector("#update-lawsuit-btn") as HTMLButtonElement
const iframeModal = document.querySelector("#iframeModal") as HTMLDivElement
const iframeViewer = document.querySelector("#iframeViewer") as HTMLIFrameElement
const iframeTitle = document.querySelector("#iframeTitle") as HTMLHeadingElement
const filterAssignedTo = document.querySelector("#filterAssignedTo  ") as HTMLSelectElement
const filters = {
  circuit: (row: HTMLTableRowElement) =>
    !activeFilters.circuit ||
    row.dataset.circuit === activeFilters.circuit,

  status: (row: HTMLTableRowElement) =>
    !activeFilters.status ||
    row.dataset.status === activeFilters.status,

  side: (row: HTMLTableRowElement) =>
    !activeFilters.side ||
    row.dataset.side === activeFilters.side,

  dueToday: (row: HTMLTableRowElement) =>
    !activeFilters.dueToday ||
    row.dataset.dueToday === "true",
};
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

// function getStatusClass(status: string) {
//   if (status === "late") return "status-late";
//   if (status === "closed") return "status-closed";
//   return "status-open";
// }

const activeFilters = { circuit: "", status: "", side: "", assignedTo: "", dueToday: false };
let lawsuitsData = Array<Lawsuits>();
let holidaysData = Array<Holidays>();
let tasksData = Array<Tasks>()
let defender: Partial<Defenders> = {}
let circuits = new Set("");
let workersData = Array<Worker>();
(async function () {
  try {
    const lawsuits = sendMessage("GET_PENDING_LAWSUITS", {}) as any
    const holidays = sendMessage("GET_HOLIDAYS", {}) as any
    const tasks = sendMessage("GET_TASKS", {}) as any
    const workers = sendMessage("GET_WORKERS", {}) as any
    const results = await Promise.all([lawsuits, holidays, tasks, workers])
    lawsuitsData = results[0].data as Lawsuits[]
    holidaysData = results[1].data as Holidays[]
    tasksData = results[2].data as Tasks[]
    workersData = results[3].data as Worker[]
    const lastUpdate = localStorage.getItem("lastUpdate")
    if (lastUpdate)
      document.querySelector("#last-update")!.innerHTML = "Ultima atualização: " + localStorage.getItem("lastUpdate")
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

    workersData.map(c => {
      const opt = document.createElement("option")
      opt.textContent = c.name
      opt.value = c.id?.toString() ?? ""
      filterAssignedTo.options.add(opt)
    })

    const creds = await getUserCredentials()
    if (creds) {
      const defenders = await getDefenders()
      if (defenders) defender = defenders.find(d => d.id === creds.id) ?? {}
    }
    sessionStorage.setItem("lawsuits", JSON.stringify(lawsuitsData))
    await renderTasks()
  } catch (error) {
    console.log(error)
  }


}())


function closePanel() {
  document.querySelector('#sidePanel')?.classList.remove('open');
  document.querySelector('#overlay')?.classList.remove('active');
}

function closeModal() {
  const closeBtn = document.querySelector(".modal-close") as HTMLElement
  closeBtn.click()
}


async function saveLawsuit(lawsuits: Lawsuits) {
  await sendMessage("SAVE_LAWSUITS", { lawsuits })
}


async function updateLawsuit(lawsuits: Lawsuits) {
  await sendMessage("UPDATE_LAWSUITS", { lawsuits })
}

async function deleteLawsuit(id: number) {
  await sendMessage("DELETE_LAWSUITS", { ids: id })

}
// Abre o painel e preenche com os dados da linha
function openPanel(id: number) {
  const number = document.querySelector('#editNumber') as HTMLInputElement
  const assisted = document.querySelector('#editAssisted') as HTMLInputElement
  const circuit = document.querySelector('#editCircuit') as HTMLSelectElement
  const status = document.querySelector('#editStatus') as HTMLSelectElement
  const side = document.querySelector('#editSide') as HTMLSelectElement
  const awareness = document.querySelector('#editAwarenessDate') as HTMLSelectElement
  const startDeadline = document.querySelector('#editStartDeadline') as HTMLSelectElement
  const endDeadline = document.querySelector('#editEndDeadline') as HTMLSelectElement
  const deleteBtn = document.querySelector(".btn-delete") as HTMLButtonElement
  const saveBtn = document.querySelector(".btn-save") as HTMLButtonElement
  document.querySelector('#sidePanel')?.classList.add('open');
  document.querySelector('#overlay')?.classList.add('active');
  document.querySelector(".btn-close")?.addEventListener("click", () => {
    closePanel()
  })
  const data = [...lawsuitsData].find(c => c.id === id)
  if (data) {
    deleteBtn.disabled = false
    number.value = data.number;
    assisted.value = data.assisted;
    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      circuit.options.add(opt)
      if (data.circuit === c) opt.selected = true
    })
    if (data.status === "Aberto") status.selectedIndex = 0
    else status.selectedIndex = 1
    if (data.isDefendant) side.selectedIndex = 1
    else side.selectedIndex = 0
    awareness.value = !data.awarenessDate ? "" : new Date(data.awarenessDate).toLocaleDateString()
    startDeadline.value = !data.initialDeadline ? "" : new Date(data.initialDeadline).toLocaleDateString()
    endDeadline.value = !data.deadline ? "" : new Date(data.deadline).toLocaleDateString()

    saveBtn.onclick = async () => {
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
      lawsuitsData[i] = { ...lawsuit }
      closePanel()
      renderTableWithOptions()
    }

    deleteBtn.onclick = async () => {
      await deleteLawsuit(id)
      showAlert("Processo deletado com sucesso.", "success")
      const idx = lawsuitsData.findIndex(c => c.id === id)
      lawsuitsData = lawsuitsData.splice(idx, 1)
      closePanel()
      renderTableWithOptions()
    }
  } else {
    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      circuit.options.add(opt)
    })
    deleteBtn.disabled = true
    saveBtn.onclick = async () => {
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
        defender: defender as Defenders,
        givenDeadLine: 15,
        initialDeadline,
        isDefendant: formData["isDefendant"]?.toString() === "0" ? true : false,
        number: formData["number"] as string,
        source: "EPROC-1G-MG",
        status: formData["status"]?.toString() === "0" ? "Aguardando Abertura" : "Aberto"
      }

      await saveLawsuit(lawsuit)
      showAlert("Processo cadastrado com sucesso.", "success")
      lawsuitsData.push({ ...lawsuit })
      closePanel()
      renderTableWithOptions()
    }

  }
}


// Exemplo de como anexar o evento no clique da linha (dentro do seu loop de renderização da tabela)
// row.onclick = () => openPanel(processo);


function changeSortOrder(propName: string, prop: keyof Lawsuits, sortOrder: string) {

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
  const today = new Date()
  data.forEach((p: Lawsuits) => {
    let dates = { days: 0, deadline: new Date, isDueDate: false }
    if (p.initialDeadline && p.deadline) {
      const dateComponents = p.deadline.toString().split("-")
      dates = getBusinessDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2])), holidays, isElapsedDays)
    }


    const tr = document.createElement("tr");
    tr.dataset.id = p.id?.toString()
    tr.dataset.status = p.status
    const timeLeft = differenceInHours(today, new Date(today.getFullYear(), today.getMonth(), today.getDate())) + " horas e " + (60 - today.getMinutes()) + " minutos restantes"
    let deadline = ""
    if (p.status === "Aberto") deadline = p.awarenessDate.toString()
    else deadline = p.deadline.toString()
    const lawsuitNumber = `${p.number.substring(0, 7)}-${p.number.substring(7, 9)}.${p.number.substring(9, 13)}.${p.number[13]}.${p.number.substring(14, 16)}.${p.number.substring(16)}`

    tr.innerHTML = `
  
  <td class="actions-cell">
    <button class="icon-btn summon" title="${p.summon ? "Ver intimação " + p.summon : ""}" data-URL=\"${p.summonURL}\"  ${p.summon ? "" : "disabled"}>
        <i class="bi bi-file-earmark"></i>
    </button>
    <button class="icon-btn view" title="Ver processo ${lawsuitNumber}">
        <i class="bi bi-eye"></i>
    </button>
    
    <button class="icon-btn edit" title="Editar processo ${lawsuitNumber}"">
        <i class="bi bi-pencil"></i>
    </button>
    <button class="icon-btn task" title="Criar tarefa">
        <i class="bi bi-check2-square"></i>
    </button>
</td>
        <td>${lawsuitNumber}</td>
        <td>${p.class}</td>
        <td>${p.circuit}</td>
        <td>${p.assisted} (${p.isDefendant ? "Passivo" : "Ativo"})</td>
        <td>${!deadline ? "Não definido" : new Date(dates.deadline).toLocaleDateString()}</td>
        <td class="${getDeadlineClass(dates.days)}">
          ${dates.isDueDate ? "Prazo Perdido" : dates.days > 0 ? dates.days + " dias" : timeLeft}
        </td>
        <td id="task-assigned-to">
        <label class="filter-label">Responsável</label>
            <select class="filter-select">
              </select>
        </td>
      `;
    tr.dataset.circuit = p.circuit
    tr.dataset.status = p.status
    tr.dataset.side = `${p.isDefendant ? "Passivo" : "Ativo"}`
    tr.dataset.dueToday = dates.days ? dates.days > 0 ? "true" : "false" : "false"
    const assignedToSelect = tr.querySelector("#task-assigned-to > select") as HTMLSelectElement
    const viewLawsuitButton = tr.querySelector("td > .icon-btn.view") as HTMLButtonElement
    const viewSummonButton = tr.querySelector("td > .icon-btn.summon") as HTMLButtonElement
    const editLawsuit = tr.querySelector("td > .icon-btn.edit") as HTMLButtonElement
    viewLawsuitButton.onclick = async () => {
      await chrome.tabs.create({ url: "./src/pages/processo.html?numero=" + p.number + "&reu=" + p.isDefendant })
    }
    viewSummonButton.onclick = (e) => {
      const summonBtn = e.target as HTMLButtonElement
      openIframeModal(summonBtn.dataset.url ?? "", "Intimação " + summonBtn.textContent)
    }

    editLawsuit.onclick = () => {
      if (p.id) openPanel(p.id);
    }


    assignedToSelect.onchange = async () => {
      if (tr.dataset.task) {
        const task = tasksData.find(c => c.id)
        if (task) {
          assignedToSelect.options.item(0)?.value
          const workerId = Number(assignedToSelect.options.item(assignedToSelect.options.selectedIndex)?.value)
          if (workerId) {
            const worker = workersData.find(c => c.id === workerId)
            if (worker) {
              await sendMessage("UPDATE_TASK", { task })
              showToast("Tarefa atualizada com sucesso.")
            }

          }
        }
      } else {
        await openEditModal({
          assignedTo: workersData[0],
          title: p.summon ?  `Manifestar sobre a intimação ${p.summon}` : "Manifestar sobre a intimação oculta",
          dueDate: addBusinessDays(new Date(), 2),
          status: "Não Iniciada",
          description: `${p.circuit}\n${p.number}\n${p.assisted}\nPrazo em dias ${p.givenDeadLine}\n Prazo final ${p.deadline}`,
          createdAt: new Date(),
          lawsuit: p
        })
      }
    }




    // const action = tr.querySelectorAll(".action-icon");
    // action[0].addEventListener("click", async () => {
    //   await chrome.tabs.create({ url: "./src/pages/processo.html?numero=" + p.number + "&reu=" + p.isDefendant })

    // })
    // action[1]?.addEventListener("click", () => {

    //   if (p.id) openPanel(p.id);
    // });

    const summon = tr.querySelector(".view-summon");
    summon?.addEventListener("click", (e) => {
      const summonBtn = e.target as HTMLButtonElement
      openIframeModal(summonBtn.dataset.url ?? "", "Intimação " + summonBtn.textContent)
    });
    // document.querySelectorAll(".action-icon").forEach(c => c.addEventListener("click", () => {
    //   if (p.id) openPanel(p.id)
    // }))

    // document.querySelectorAll(".view-summon").forEach(d => {
    //   d.addEventListener("click", (e) => {
    //     const summonBtn = e.target as HTMLButtonElement
    //     openIframeModal(summonBtn.dataset.url ?? "", "Intimação " + summonBtn.textContent)

    //   })

    //   tr.onclick = () => alert("Abrir processo: " + p.number);
    table!.appendChild(tr);

  })



  //   tr.onclick = () => alert("Abrir processo: " + p.number);

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
        th.addEventListener("click", () => {
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
      }
      const defensories = localStorage.getItem("defensories")
      if (!defensories) await getDefensories()

      const searchField = document.querySelector("#search")!
      searchField.addEventListener("keydown", () => {
        updateChipText()
      })

      updateLawsuitsBtn.addEventListener("click", async () => {
        await updateLawsuitDashboard()
        showToast("Processos atualizados com sucesso", 3000)
        document.querySelector("#last-update")!.innerHTML = "Ultima atualização: " + localStorage.getItem("lastUpdate")
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

      const intervalId = setInterval(() => {
        const selects = document.querySelectorAll("tr > td > select") as NodeListOf<HTMLSelectElement>
        selects.forEach((c: HTMLSelectElement) => {
          workersData.map(x => {
            const option = document.createElement("option")
            option.label = x.name
            option.value = String(x.id)
            c.options.add(option)
            const row = c.parentElement?.parentElement as HTMLTableRowElement
            row.dataset.filter += "; " + x.name
          })
        })
        clearInterval(intervalId)
      }, 1000);

      filterRows()




    }
    activeFilters.status = "Aberto"
    renderActiveFilters()


    const navItems = document.querySelectorAll(".nav-item")
    if (navItems) {
      const title = document.querySelector("#page-title") as HTMLHeadingElement
      navItems.forEach((item, i) => {
        item.addEventListener("click", () => {
          if (i === 0) title.textContent = "Processos"
          else if (i === 1) title.textContent = "Tarefas"
          else title.textContent = "Configurações"
          goToPage(i)
        })
      })
    }

  } catch (error) {
    console.error(error)
  }
})

document.querySelector("#filterCircuit")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todas") {
    activeFilters.circuit = ""
    updateChipText()
  } else {
    activeFilters.circuit = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterStatus")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.status = ""
    updateChipText()
  } else {
    activeFilters.status = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterSide")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.side = ""
    updateChipText()
  } else {
    activeFilters.side = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterAssignedTo")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  // const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.assignedTo = ""
    updateChipText()
  } else {
    activeFilters.assignedTo = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector(".card.red")?.addEventListener("click", () => {
  activeFilters.dueToday = true
  updateChipText()
})

document.querySelector("#toggleable-actions")?.addEventListener("click", async () => {
  const items = document.querySelector(".nav-links") as HTMLElement
  if (items.children.item(0)?.className.includes("active"))
    openPanel(0)
  else if (items.children.item(1)?.className.includes("active")) await openEditModal()
  else {

  }
})


function updateCards() {
  let weekCount = 0, activeCount = 0, dueTodayCount = 0
  const rows = document.querySelectorAll("tbody tr") as NodeListOf<HTMLTableRowElement>
  for (const row of rows) {
    if (row.dataset.status === "Aberto" && row.style.display === "") activeCount++

    const date = row.cells.item(6)?.textContent ?? ""
    if (date.includes("dias") && row.dataset.status === "Aberto" && row.style.display === "") {
      const daysLeft = Number(date.split(" ")[0])
      if (daysLeft < 6) weekCount++
    } else if (date.includes("horas") && row.dataset.status === "Aberto" && row.style.display === "") weekCount++
    else if (row.dataset.status === "Aberto" && row.dataset.dueToday === "true" && row.style.display === "") dueTodayCount++
  }

  document.querySelector("#todayCount")!.innerHTML = String(dueTodayCount)
  document.querySelector("#weekCount")!.innerHTML = String(weekCount)
  document.querySelector("#activeCount")!.innerHTML = String(activeCount)

  // document.querySelector("#doneCount")!.innerHTML =
  //   data.filter(c => c.status === "closed").length.toString();
}

function filterRows() {
  document.querySelectorAll<HTMLTableRowElement>("tbody tr")
    .forEach(row => {
      const visible = Object.values(filters)
        .every(filter => filter(row));

      row.hidden = !visible;
    });
  updateCards()
}

function updateChipText() {
  const search = document.querySelector("#search") as HTMLInputElement
  if (activeFilters.circuit) {
    updateChips("circuit", "Vara: " + activeFilters.circuit)
    // filtered = filtered.filter(l => l.circuit === activeFilters.circuit);
    // filterTableRows(3, activeFilters.circuit)
  }
  if (activeFilters.status !== "") {
    updateChips("status", "Status: " + activeFilters.status)
    // filtered = filtered.filter(l => String(l.status) === activeFilters.status);
    // filterTableRows(3, activeFilters.status)

  }


  if (activeFilters.side) {
    // const isDefendant = activeFilters.side === "Passivo";
    updateChips("side", "Polo: " + activeFilters.side)
    // filterTableRows(3, activeFilters.side)

    // filtered = filtered.filter(l => l.isDefendant === isDefendant);
  }

  if (activeFilters.assignedTo) {
    updateChips("assignedTo", "Atribuído a: " + activeFilters.assignedTo)
  }

  if (activeFilters.dueToday) {

    updateChips("dueToday", "Vence hoje: sim")
  }

  if (search.value) updateChips("dueToday", "Pesquisa: " + search.value)

  filterRows()

}

// if (term) {
//   filtered = filtered.filter(c =>
//     c.assisted.toUpperCase().includes(term.toUpperCase()) ||
//     c.number.includes(term)
//   );
// }

// type FilterKey = keyof typeof activeFilters
// const filterKeys = new Array<FilterKey>()
// for (const filter of filterKeys) {
//   const button = document.querySelector(`activeFiltersBar > .filter-chip > button[data-key=${}]`) as HTMLButtonElement
//   if (filter === button.dataset.key && (activeFilters[filter] as any)) {
//     const pos = button.parentElement?.textContent.indexOf(":")
//     let baseText = button.textContent.substring(0, pos)
//     baseText += " " + activeFilters[filter] as any
//     button.textContent = "x"
//   }

// }
// updateCards(filtered)
//renderTable(filtered);


function updateChips(key: string, filter: string) {
  const button = document.querySelector(`#activeFiltersBar > .filter-chip > button[data-key=${key}]`) as HTMLButtonElement
  button.parentElement!.innerHTML = `${filter}<button data-key=${key}>x</button>`
  button.textContent = "x"
}


function goToPage(index: number) {
  const slider = document.getElementById('mainSlider');
  const items = document.querySelectorAll('.nav-item');

  // Deslocamento suave
  if (slider) {
    slider.style.transform = `translateX(-${index * 100}vw)`;

    // Atualiza o estado visual do texto
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });


    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function openEditModal(task?: Tasks) {
  const workers = await getWorkers()
  if (!workers) return
  let officeWorkers = ""
  workers.map((w, i) => {
    officeWorkers += `<option value=${i}>${w.name}</option>\n`

  })
  renderModal().open({
    title: task?.id ? "Atualize sua tarefa" : "Crie sua tarefa",
    content: `
     <form id="taskForm" data-id=${task?.id}>
        <div class="form-group">
          <label>Número do Processo</label>
          <input name="number" type="text" id="editNumber" value="${task?.lawsuit?.number ?? ""}"s>
        </div>
        <div class="form-group">
          <label>Titulo da tarefa</label>
          <input name="title" type="text" id="editNumber" value="${task?.title ?? ""}">
        </div>
         <div class="form-group">
          <label>Descrição da tarefa</label>
          <textarea name="description" rows="4">${task?.description ?? ""}</textarea>
        </div>
        ${task ? `<div class="form-group">
          <label>Status</label>
          <select name="status" id="editSide">
            <option>Não Iniciada</option>
            <option>Em Andamento</option>
            <option>Concluida</option>
            </option>Vencida</option>
          </select>
        </div>`: ``
      }
         <div class="form-group">
          <label>Prazo</label>
          <input name="dueDate" type="text" id="editNumber" value="${task?.dueDate ?? ""}">
        </div>
        <div class="form-group">
          <label>Responsável</label>
          <select name="assignedTo" id="editSide">
           ${officeWorkers}
          </select>        
        </div>  
        </form>
    
    `,
    actions: task ? [
      { label: 'Deletar tarefa', className: 'btn-delete', callback: async () => await deleteTask() },
      { label: 'Atualizar tarefa', className: 'btn-primary', callback: async () => await saveTask(workers, true) }
    ] : [
      { label: 'Salvar tarefa', className: 'btn-primary', callback: async () => await saveTask(workers, false) }
    ]
  })
}

async function saveTask(workers: Worker[], edit: boolean) {
  const form = document.querySelector("#taskForm") as HTMLFormElement
  const formFields = Object.fromEntries(new FormData(form))
  const lawsuit = lawsuitsData.find(c => c.number === formFields["number"])!
  const id = parseInt(form.dataset.id ?? "")
  switch (formFields["status"]) {
    case "0":
      status = "Não Iniciada"
      break
    case "1":
      status = "Em Andamento"
      break
    case "2":
      status = "Concluida"
      break
    case "3":
      status = "Vencida"
      break
  }
  const task: Tasks = {
    assignedTo: workers.find(c => c.id === Number(formFields["assignedTo"])) ?? workers[0]!,
    createdAt: new Date(),
    description: formFields["description"] as string,
    dueDate: formFields["dueDate"] as string,
    lawsuit,
    status: edit ?
      formFields["status"] === "0" ? "Não Iniciada" :
        formFields["status"] === "1" ? "Em Andamento" :
          formFields["status"] === "2" ? "Concluida" :
            "Vencida" : "Não Iniciada",
    title: formFields["title"] as string,


    id: isNaN(id) ? 0 : id
  }

  if (edit) {
    await sendMessage("UPDATE_TASK", { task })
    showAlert("Tarefa atualizada com sucesso.", "success")

  }
  else {
    await sendMessage("SAVE_TASK", { task })
    showAlert("Tarefa criada com sucesso.", "success")

  }
}


async function deleteTask() {
  const form = document.querySelector("#taskForm") as HTMLFormElement
  const id = parseInt(form.dataset.id ?? "")
  await sendMessage("DELETE_TASK", { id })
  showAlert("Tarefa deletada com sucesso.", "success")

  closeModal()

}

async function renderTasks() {
  const todoList = document.querySelector(".todo-list") as HTMLElement
  todoList.innerHTML = tasksData.map(t =>
    `<div class="todo-item" data-task-id=${t.id}>
              <div class="todo-header">
                <span class="todo-lawsuit">${t.lawsuit?.number}</span>
                <span class="badge ${t.status === "Não Iniciada" ?
      "warning" : t.status === "Em Andamento" ?
        "info" : t.status === "Concluida" ?
          "success" : "danger"}">${t.status}</span>
              </div>
              <div class="todo-body">
                <h3 class="todo-title">${t.title}</h3>
                <p class="todo-desc">${t.description.length > 100 ? t.description.substring(0, 99) + "..." : t.description}</p>
              </div>
              <div class="todo-footer">
                <div class="todo-info">
                  <span class="info-label">Responsável:</span>
                  <span class="info-value">${t.assignedTo ? t.assignedTo.name : ""}</span>
                </div>
                <div class="todo-info">
                  <span class="info-label">Prazo:</span>
                  <span class="info-value">${t.dueDate}</span>
                </div>
              </div>
            </div> `
  ).join("")

  for await (const task of tasksData) {
    document.querySelector(`[data-task-id="${task.id}"]`)?.addEventListener("click", async () => {
      await openEditModal(task)
    })
  }

  document.querySelector("#closeIframeModal")?.addEventListener("click", closeIframeModal);

  iframeModal.addEventListener("click", e => {
    if (e.target === iframeModal)
      closeIframeModal();
  });

  document.querySelector("#openNewTab")?.addEventListener("click", () => {
    if (iframeViewer.src) window.open(iframeViewer.src, "_blank");
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape")
      closeIframeModal();
  });


}


function openIframeModal(url: string, title: string) {
  iframeTitle.textContent = title;
  iframeViewer.src = url;
  iframeModal.classList.add("active");
}

function closeIframeModal() {
  iframeModal.classList.remove("active");
  iframeViewer.src = "";
}


function renderActiveFilters() {

  const bar = document.querySelector("#activeFiltersBar") as HTMLDivElement;

  bar.innerHTML = "";

  const filters = [
    {
      key: "circuit",
      label: "Vara",
      value: activeFilters.circuit
    },
    {
      key: "status",
      label: "Status",
      value: activeFilters.status
    },
    {
      key: "side",
      label: "Polo",
      value: activeFilters.side
    },
    {
      key: "assignedTo",
      label: "Responsável",
      value: activeFilters.assignedTo
    },
    {
      key: "dueToday",
      label: "Vencendo hoje",
      value: activeFilters.dueToday ? "Sim" : ""
    },
    {
      key: "search",
      label: "Pesquisa",
      value: (document.querySelector("#search") as HTMLInputElement).value
    }
  ];

  for (const f of filters) {
    const chip = document.createElement("div");
    chip.className = "filter-chip";
    chip.innerHTML = ` ${f.label}: ${f.value} <button data-key="${f.key}">&times;</button>`;
    bar.appendChild(chip);
  }


  if (bar.children.length) {
    const clear = document.createElement("button");
    clear.className = "clear-filters";
    clear.textContent = "Limpar todos";
    clear.onclick = clearAllFilters;
    bar.appendChild(clear);

  }

}

document.addEventListener("click", (e) => {

  const target = e.target as HTMLElement;

  if (!target.matches(".filter-chip button"))
    return;

  const key = target.dataset.key!;

  switch (key) {

    case "circuit":
      activeFilters.circuit = "";
      (document.querySelector("#filterCircuit") as HTMLSelectElement).selectedIndex = 0;
      break;

    case "status":
      activeFilters.status = "";
      (document.querySelector("#filterStatus") as HTMLSelectElement).selectedIndex = 0;
      break;

    case "side":
      activeFilters.side = "";
      (document.querySelector("#filterSide") as HTMLSelectElement).selectedIndex = 0;
      break;

    case "assignedTo":
      activeFilters.assignedTo = "";
      (document.querySelector("#filterAssignedTo") as HTMLSelectElement).selectedIndex = 0;
      break;

    case "dueToday":
      activeFilters.dueToday = false;
      break;
  }

  updateChipText();

  renderActiveFilters();

});

function clearAllFilters() {

  activeFilters.circuit = "";
  activeFilters.status = "";
  activeFilters.side = "";
  activeFilters.assignedTo = "";
  activeFilters.dueToday = false;

  document.querySelectorAll("select").forEach(s => s.selectedIndex = 0);

  updateChipText();

  renderActiveFilters();

}