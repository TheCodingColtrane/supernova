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
const updateLawsuitsBtn = document.querySelector("#update-lawsuit-btn") as HTMLButtonElement
const iframeModal = document.querySelector("#iframeModal") as HTMLDivElement
const iframeViewer = document.querySelector("#iframeViewer") as HTMLIFrameElement
const iframeTitle = document.querySelector("#iframeTitle") as HTMLHeadingElement
const filterAssignedTo = document.querySelector("#filterAssignedTo ") as HTMLSelectElement
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
    console.log(workersData)
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

    saveBtn?.addEventListener("click", async () => {
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
    })

    deleteBtn?.addEventListener("click", async () => {
      await deleteLawsuit(id)
      showAlert("Processo deletado com sucesso.", "success")
      const idx = lawsuitsData.findIndex(c => c.id === id)
      lawsuitsData = lawsuitsData.splice(idx, 1)
      closePanel()
      renderTableWithOptions()
    })
  } else {
    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      circuit.options.add(opt)
    })
    deleteBtn.disabled = true
    saveBtn?.addEventListener("click", async () => {
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
    })

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
    const timeLeft = differenceInHours(today, new Date(today.getFullYear(), today.getMonth(), today.getDate())) + " horas e " + (60 - today.getMinutes()) + " minutos restantes"
    tr.innerHTML = `
        <td class="row-action">
         <span class="action-icon">Editar</span>
        </td>
        <td>${p.number} 
        <button data-URL=\"${p.summonURL}\" class="btn-secondary view-summon">
          <i class="bi bi-file-earmark"></i>
          ${p.summon}  </button>
        </td>
        <td>${p.class}</td>
        <td>${p.circuit}</td>
        <td>${p.assisted}</td>
        <td><span class="badge ${getStatusClass(p.status)}">${p.status}</span></td>
        <td>${p.isDefendant ? "Passivo" : "Ativo"}</td>
        <td>${!p.deadline ? "Não definido" : new Date(dates.deadline).toLocaleDateString()}</td>
        <td class="${getDeadlineClass(dates.days)}">
          ${dates.isDueDate ? "Prazo Perdido" : dates.days > 0 ? dates.days + " dias" : timeLeft}
        </td>
        <td>${Array.isArray(p.defender) ? "Defensores da vara" : p.defender.nome}</td>
      `;
    document.querySelectorAll(".action-icon").forEach(c => c.addEventListener("click", () => {
      if (p.id) openPanel(p.id)
    }))

    document.querySelectorAll(".view-summon").forEach(d => {
      d.addEventListener("click", (e) => {
        const summonBtn = e.target as HTMLButtonElement
        openIframeModal(summonBtn.dataset.url ?? "", "Intimação " + summonBtn.textContent)

      })

      //   tr.onclick = () => alert("Abrir processo: " + p.number);

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
        const defensories = localStorage.getItem("defensories")
        if (!defensories) await getDefensories()

        const searchField = document.querySelector("#search")!
        searchField.addEventListener("keydown", () => {
          const input = searchField as HTMLInputElement
          searchLawsuits(input.value)
        })

        updateLawsuitsBtn.addEventListener("click", async () => {
          await updateLawsuitDashboard()
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

document.querySelector("#toggleable-actions")?.addEventListener("click", async () => {
  const items = document.querySelector(".nav-links") as HTMLElement
  if (items.children.item(0)?.className.includes("active"))
    openPanel(0)
  else if (items.children.item(1)?.className.includes("active")) await openEditModal()
  else {

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
    title: task ? "Atualize sua tarefa" : "Crie sua tarefa",
    content: `
     <form id="taskForm" data-id=${task?.id}>
        <div class="form-group">
          <label>Número do Processo</label>
          <input name="number" type="text" id="editNumber" value=${task?.lawsuit?.number ?? ""}>
        </div>
        <div class="form-group">
          <label>Titulo da tarefa</label>
          <input name="title" type="text" id="editNumber" value=${task?.title ?? ""}>
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
          <input name="dueDate" type="text" id="editNumber" value=${task?.dueDate ?? ""}>
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

