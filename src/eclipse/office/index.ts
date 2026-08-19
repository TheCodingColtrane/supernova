import { formatISO } from "date-fns/formatISO";
import type { Defenders } from "../types/office";
import type { Holidays } from "../types/holidays";
import type { Worker } from "../types/workers";
import type { Lawsuits } from "../types/lawsuits"
import type { Tasks } from "../types/tasks";
import { getDefenders, getUserCredentials, renderModal, sendMessage } from "../utils"
import { getDeadline, localDateToIsoDate } from "../utils/date";
import { getDefensories, isLoggedIn, updateLawsuitDashboard } from "../service/fetcher";
import { hideLoadingSpinner, showLoadingSpinner, showToast } from "../utils/ui";
import { addBusinessDays, addDays } from "date-fns";
import { renderUtilities } from "./utilities";
import type { UserPreferences } from "../types/user";
const updateLawsuitsBtn = document.querySelector("#update-lawsuit-btn") as HTMLButtonElement
const iframeModal = document.querySelector("#iframeModal") as HTMLDivElement
const iframeViewer = document.querySelector("#iframeViewer") as HTMLIFrameElement
const iframeTitle = document.querySelector("#iframeTitle") as HTMLHeadingElement
const filterAssignedTo2 = document.querySelector("#filterAssignedTo2") as HTMLSelectElement
const taskSearchInput = document.querySelector("#searchTaskInput") as HTMLInputElement
const filterRowCount = document.querySelector("#filterRowCount") as HTMLSelectElement
const filterTasksRowCount = document.querySelector("#filterTasksRowCount") as HTMLSelectElement
let availableWorkers = "<option value='0'>A definir</option>"
let currentPage = 1;
let lawsuitPageSize = 30;
let taskPageSize = 12
let filteredLawsuits: Lawsuits[] = [];
let filteredTasks: Tasks[] = []
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
  const rawPreferences = localStorage.getItem("preferences")
  if (rawPreferences) {
    const { office } = JSON.parse(rawPreferences) as UserPreferences
    const deadlinesPriorities = office.deadlinesPriorities
    if (days <= deadlinesPriorities.highest) return "deadline-danger";
    else if (days <= deadlinesPriorities.high) return "deadline-semi-danger";
    else if (days <= deadlinesPriorities.medium) return "deadline-warning";
    else if (days <= deadlinesPriorities.low) return "deadline-semi-ok";
    else return "deadline-ok";
  }
  if (days <= 0) return "deadline-danger";
  if (days <= 3) return "deadline-warning";
  return "deadline-ok";
}

function paginateLawsuitTable(data: Lawsuits[], initialRender = false) {

  filteredLawsuits = data;
  const start = (currentPage - 1) * lawsuitPageSize;
  const end = start + lawsuitPageSize;
  const isElapsedDays = document.querySelector("#checkCalendarDays") as HTMLInputElement
  const isHolidays = document.querySelector("#checkHolidays") as HTMLInputElement
  if (initialRender) {
    activeFilters.mainPage.status = "Aberto"
    filterItems()
    renderPagination(0);
    return
  }
  renderTable(
    filteredLawsuits.slice(start, end),
    isHolidays.checked ? holidaysData : [],
    isElapsedDays.checked ? true : false,
    initialRender
  );

  renderPagination(0);

}


async function paginateTasks(data: Tasks[]) {

  filteredTasks = data;

  const start = (currentPage - 1) * taskPageSize;
  const end = start + taskPageSize;
  await renderTasks(filteredTasks.slice(start, end));

  renderPagination(1);

}

function renderPagination(activePage = 0) {
  // let activePage = 0
  // const navItems = document.querySelectorAll(".nav-item")
  // if (navItems.item(1).className === "nav-item active") activePage = 1
  const container = document.querySelector(!activePage ? ".table-container >.pagination" : ".container > .pagination")!;

  container.innerHTML = "";

  const totalPages = !activePage ? Math.ceil(filteredLawsuits.length / lawsuitPageSize) : Math.ceil(filteredTasks.length / taskPageSize);

  const previous = document.createElement("button");
  previous.innerHTML = "<i class='bi bi-arrow-left'></i>";
  previous.disabled = currentPage === 1;

  previous.onclick = () => {
    currentPage--;
    if (!activePage)
      paginateLawsuitTable(filteredLawsuits);
    else
      paginateTasks(filteredTasks)
    window.scrollTo({ top: 0, behavior: 'smooth' });

  };

  container.append(previous);

  for (let i = 1; i <= totalPages; i++) {

    const btn = document.createElement("button");

    btn.innerHTML = String(i);

    if (i === currentPage)
      btn.classList.add("active");

    btn.onclick = () => {
      currentPage = i;
      if (!activePage)
        paginateLawsuitTable(filteredLawsuits);
      else
        paginateTasks(filteredTasks)
      window.scrollTo({ top: 0, behavior: 'smooth' });

    };

    container.append(btn);
  }

  const next = document.createElement("button");
  next.innerHTML = "<i class='bi bi-arrow-right'></i>";
  next.disabled = currentPage === totalPages;

  next.onclick = () => {
    currentPage++;
    if (!activePage)
      paginateLawsuitTable(filteredLawsuits);
    else
      paginateTasks(filteredTasks)
    window.scrollTo({ top: 0, behavior: 'smooth' });

  };

  container.append(next);
}

function getFilteredItems() {
  let activePage = 0
  const navItems = document.querySelectorAll(".nav-item")

  if (navItems.item(1).className === "nav-item active") activePage = 1
  const curDate = new Date()
  const friday = new Date(curDate);
  friday.setDate(curDate.getDate() - curDate.getDay() + 5);
  // const isolastWeekWorkingDay = lastWeekWorkingDay.toISOString().split("T")[0]
  const lastWeekWorkingDay = new Date(friday.toISOString().split("T")[0] + "T03:00:00.000Z")
  let isoDeadline = new Date()
  const isoToday = new Date(new Date().toISOString().split("T")[0] + "T03:00:00.000Z")
  if (!activePage)
    return lawsuitsData.filter(item => {
      if (item.deadline)
        isoDeadline = new Date(item.deadline + "T03:00:00.000Z")

      if (activeFilters.mainPage.circuit &&
        item.circuit !== activeFilters.mainPage.circuit)
        return false;

      if (activeFilters.mainPage.status &&
        item.status !== activeFilters.mainPage.status)
        return false;

      if (activeFilters.mainPage.side &&
        (item.isDefendant ? "Passivo" : "Ativo") !== activeFilters.mainPage.side)
        return false;

      if (activeFilters.mainPage.class && item.class !== activeFilters.mainPage.class)
        return false

      if (activeFilters.mainPage.dueToday)
        if (item.daysLeft !== 0)
          return false

      if (activeFilters.mainPage.dueThisWeek)
        if (item.daysLeft && item.daysLeft > 4 || isoDeadline > lastWeekWorkingDay)
          return false

      if (activeFilters.mainPage.search) {

        const txt = activeFilters.mainPage.search.toUpperCase();

        if (
          !item.assisted.toUpperCase().includes(txt) &&
          !item.number.includes(txt)
        )
          return false;

      }

      return true;
    });
  else
    return tasksData.filter(task => {
      if (task.dueDate)
        isoDeadline = new Date(task.dueDate + "T03:00:00.000Z")

      if (activeFilters.todoPage.circuit &&
        task.lawsuit?.circuit !== activeFilters.todoPage.circuit)
        return false;

      if (activeFilters.todoPage.status &&
        task.status !== activeFilters.todoPage.status)
        return false;

      if (activeFilters.todoPage.assignedTo &&
        activeFilters.todoPage.assignedTo !== task.assignedTo.name
      )
        return false;

      if (activeFilters.todoPage.finalized && task.status !== "Concluida")
        return false

      if (activeFilters.todoPage.dueToday) {

        if (isoDeadline.toISOString() !== isoToday.toISOString())
          return false
      }
      if (activeFilters.todoPage.dueThisWeek) {
        if (isoDeadline > lastWeekWorkingDay)
          return false
      }


      if (activeFilters.todoPage.search) {

        const txt = activeFilters.todoPage.search.toUpperCase();
        if (
          !task.lawsuit?.number.includes(txt) &&
          !task.title.toUpperCase().includes(txt)
        )
          return false;
      }


      return true

    })



}

console.log(getFilteredItems)
function filterItems() {
  let activePage = 0
  const navItems = document.querySelectorAll(".nav-item")
  if (navItems.item(1).className === "nav-item active") activePage = 1
  currentPage = 1;

  const filtered = getFilteredItems();
  if (!activePage)
    paginateLawsuitTable(filtered as Lawsuits[]);
  else
    paginateTasks(filtered as Tasks[])
  updateCards();
}

const activeFilters = {
  mainPage: { circuit: "", status: "", side: "", assignedTo: "", dueToday: false, dueThisWeek: false, search: "", class: "", finalized: false },
  todoPage: { number: "", circuit: "", status: "", assignedTo: "", dueToday: false, dueThisWeek: false, caseNumber: "", search: "", finalized: false }
};
let lawsuitsData = Array<Lawsuits>();
let holidaysData = Array<Holidays>();
let tasksData = Array<Tasks>()
let defender: Partial<Defenders> = {}
let circuits = new Set("");
let lawsuitClasses = new Set("");
let workersData = Array<Worker>();
(async function () {
  try {
    const lawsuits = sendMessage("GET_PENDING_LAWSUITS", {}) as any
    const holidays = sendMessage("GET_HOLIDAYS", {}) as any
    const tasks = sendMessage("GET_TASKS", {}) as any
    const workers = sendMessage("GET_WORKERS", {}) as any
    const user = await getUserCredentials()
    if (!user) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs[0];
        chrome.tabs.update(tab.id, { url: "./src/pages/equipe.html" });
      });
    }

    const hour = new Date().getHours()
    const title = document.querySelector("#page-title") as HTMLHeadingElement
    const hostName = user!.nome.split(" ")[0]
    const name = hostName[0].toUpperCase() + hostName?.substring(1).toLowerCase()
    if (hour > 5 && hour < 12)
      title.innerHTML = "Bom dia, Dr(a). " + name
    if (hour > 11 && hour < 18)
      title.innerHTML = "Boa tarde, Dr(a). " + name
    else
      title.innerHTML = "Boa noite, Dr(a). " + name


    const login = await isLoggedIn()
    if (!login) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs[0];
        alert("Você precisa entrar no solar.")
        chrome.tabs.update(tab.id, { url: "https://solar.defensoria.mg.def.br/login" });
      })
    }

    const results = await Promise.all([lawsuits, holidays, tasks, workers])
    lawsuitsData = results[0].data as Lawsuits[]
    holidaysData = results[1].data as Holidays[]
    tasksData = results[2].data as Tasks[]
    workersData = results[3].data as Worker[]
    const lastUpdate = localStorage.getItem("lastUpdate")
    if (lastUpdate)
      document.querySelector("#last-update")!.innerHTML = "Ultima atualização: " + localStorage.getItem("lastUpdate")
    const now = new Date()
    lawsuitsData = lawsuitsData.map(c => {
      if (!circuits.has(c.circuit)) circuits.add(c.circuit)
      if (!lawsuitClasses.has(c.class ?? "")) lawsuitClasses.add(c.class ?? "")
      let dates = { days: 0, deadline: new Date, isDueDate: false }
      if (c.initialDeadline && c.deadline) {
        const dateComponents = c.deadline.toString().split("-")
        dates = getDeadline(new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2])), holidays, false)
        c.daysLeft = dates.days
      }
      return c
    })

    const select = document.querySelector("#filterCircuit") as HTMLSelectElement
    const circuitSelect = document.querySelector("#filterCircuit2") as HTMLSelectElement
    const filterClass = document.querySelector("#filterClass") as HTMLSelectElement


    circuitSelect.addEventListener("change", (e) => {
      const select = e.target as HTMLSelectElement
      if (select.selectedOptions.item(0)?.textContent === "Todas") {
        activeFilters.todoPage.circuit = ""
        updateChipText()
      } else {
        activeFilters.todoPage.circuit = select.selectedOptions.item(0)?.textContent!
        updateChipText()
      }
    })
    filterClass.addEventListener("change", () => {
      const selectedItem = filterClass.options.item(filterClass.selectedIndex)!.label
      if (selectedItem === "Todos") {
        activeFilters.mainPage.class = ""
        updateChipText()
      } else {
        activeFilters.mainPage.class = selectedItem
        updateChipText()
      }

    })
    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      select.options.add(opt)
      const opt2 = document.createElement("option")
      opt2.textContent = c
      circuitSelect.options.add(opt2)
    })

    workersData.map(c => {
      const opt2 = document.createElement("option")
      opt2.textContent = c.name
      opt2.value = c.id?.toString() ?? ""
      filterAssignedTo2.options.add(opt2)
      availableWorkers += `<option value="${c.id}">${c.name}</option>`

    })


    lawsuitClasses.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      filterClass.options.add(opt)
    })

    filterRowCount.addEventListener("change", () => {
      lawsuitPageSize = Number(filterRowCount[filterRowCount.selectedIndex].label)
      paginateLawsuitTable(lawsuitsData)
    })




    const creds = await getUserCredentials()
    if (creds) {
      const defenders = await getDefenders()
      if (defenders) defender = defenders.find(d => d.id === creds.id) ?? {}
    }
    paginateTasks(tasksData)
    try {
      if (lawsuitsData.length) {

        const rawLastUpdate = localStorage.getItem("lastUpdate")
        if (rawLastUpdate) {
          const rawDateText = rawLastUpdate.substring(0, 10).split("/")
          const date = new Date(rawDateText[2] + "-" + rawDateText[1] + "-" + rawDateText[0] + "T03:00:00.000Z")
          let nextDate = addDays(date, 1)
          // nextDate = addHours(nextDate, 3)
          if (new Date() > nextDate) {
            await updateLawsuitTable(true)
          } else {
            paginateLawsuitTable(lawsuitsData, true)
            // renderTable(lawsuitsData, [], undefined, true)

          }
        } else paginateLawsuitTable(lawsuitsData, true) //renderTable(lawsuitsData, [], undefined, true)

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

        const searchField = document.querySelector("#searchLawsuitInput")!
        searchField.addEventListener("keyup", (e) => {
          activeFilters.mainPage.search = (e.target as HTMLInputElement).value
          // paginateLawsuitTable(lawsuitsData)
          updateChipText()
        })



        updateLawsuitsBtn.addEventListener("click", async () => updateLawsuitTable())

        const today = formatISO(new Date(), { representation: 'date' })
        document.querySelector("#todayCount-p1")!.innerHTML = lawsuitsData.filter(c => c.deadline === today).length.toString()
        document.querySelector("#weekCount-p1")!.innerHTML = lawsuitsData.length.toString()
        document.querySelector("#activeCount-p1")!.innerHTML = lawsuitsData.length.toString()


        document.querySelector("#checkHolidays")?.addEventListener("change", () => {
          if (holidaysData) {
            // const isElapsedDays = document.querySelector("#checkCalendarDays") as HTMLInputElement
            // const input = e.target as HTMLInputElement
            paginateLawsuitTable(lawsuitsData)
            // renderTable(lawsuits, input.checked ? holidaysData : [], isElapsedDays.checked)
          }

        })

        document.querySelector("#checkCalendarDays")?.addEventListener("change", () => {
          if (holidaysData) {
            paginateLawsuitTable(lawsuitsData)

          }
        })

        // document.querySelector("#groupLawsuits")?.addEventListener("click", (e) => {
        //   const ground = e.target as HTMLInputElement
        //   if (ground.value === "on") {

        //   }
        // })


      } else {
        await updateLawsuitTable()
        window.location.reload()
      }

      activeFilters.mainPage.status = "Aberto"
      renderActiveFilters()
      renderUtilities()

      const navItems = document.querySelectorAll(".nav-item")
      if (navItems) {
        navItems.forEach((item, i) => {
          item.addEventListener("click", () => {
            goToPage(i)
            updateCards()

          })
        })
      }

    } catch (error) {
      console.error(error)
    }



  } catch (error) {
    console.log(error)
  }
  updateCards()
  const fab = document.querySelector("#toggleable-actions") as HTMLButtonElement
  fab.hidden = true

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


async function updateLawsuitTable(initialRender = false) {
  showLoadingSpinner()
  const lawsuits = await updateLawsuitDashboard()
  if (lawsuits) {
    showToast("Processos atualizados com sucesso. " + lawsuits?.length + " novos processos", 3000)
    const savedLawsuits = await sendMessage("GET_PENDING_LAWSUITS", {}) as any
    if (savedLawsuits.data)
      lawsuitsData = savedLawsuits.data
    document.querySelector("#last-update")!.innerHTML = "Ultima atualização: " + localStorage.getItem("lastUpdate")
    hideLoadingSpinner()
    //renderTableWithOptions()
    paginateLawsuitTable(lawsuitsData, initialRender)
  }
}
// Abre o painel e preenche com os dados da linha
function openPanel(currentLawsuit?: Lawsuits) {
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
  if (currentLawsuit) {
    deleteBtn.disabled = false
    number.value = currentLawsuit.number;
    assisted.value = currentLawsuit.assisted;
    circuits.forEach(c => {
      const opt = document.createElement("option")
      opt.textContent = c
      circuit.options.add(opt)
      if (currentLawsuit.circuit === c) opt.selected = true
    })
    if (currentLawsuit.status === "Aberto") status.selectedIndex = 0
    else status.selectedIndex = 1
    if (currentLawsuit.isDefendant) side.selectedIndex = 1
    else side.selectedIndex = 0
    awareness.value = !currentLawsuit.awarenessDate ? "" : new Date(currentLawsuit.awarenessDate).toISOString().split("T")[0]
    startDeadline.value = !currentLawsuit.initialDeadline ? "" : new Date(currentLawsuit.initialDeadline).toISOString().split("T")[0]
    endDeadline.value = !currentLawsuit.deadline ? "" : new Date(currentLawsuit.deadline).toISOString().split("T")[0]

    saveBtn.onclick = async () => {
      const form = document.querySelector("#editForm") as HTMLFormElement
      const formData = Object.fromEntries(new FormData(form))
      let awarenessDate = formData["awarenessDate"] as string
      let initialDeadline = formData["initialDeadline"] as string
      let deadline = formData["deadline"] as string

      // if (new Date(awarenessDate) > new Date(initialDeadline)) {
      //   showToast("Data de ciência maior do que prazo inicial.")
      //   return
      // }
      if (new Date(initialDeadline) > new Date(deadline)) {
        showToast("Prazo inicial maior do que prazo final.")
        return
      }

      const lawsuit: Lawsuits = {
        assisted: formData["assisted"] as string,
        awarenessDate,
        circuit: formData["circuit"] as string,
        deadline,
        defender: currentLawsuit.defender,
        givenDeadLine: currentLawsuit.givenDeadLine,
        initialDeadline,
        isDefendant: formData["isDefendant"]?.toString() === "0" ? true : false,
        number: formData["number"] as string,
        source: currentLawsuit.source,
        status: formData["status"]?.toString() === "0" ? "Aguardando Abertura" : formData["status"]?.toString() === "1" ? "Aberto" : "Finalizado",
        id: currentLawsuit.id,
        class: currentLawsuit.class,
        daysLeft: currentLawsuit.daysLeft,
        updatedAt: new Date(),
        summon: currentLawsuit.summon,
        summonURL: currentLawsuit.summonURL,
        favoriteEvents: currentLawsuit.favoriteEvents,
        createdAt: currentLawsuit.createdAt
      }
      await updateLawsuit(lawsuit)
      showAlert("Processo atualizado com sucesso.", "success")
      const i = lawsuitsData.findIndex(c => c.id === currentLawsuit.id)
      if (lawsuit.status != "Finalizado")
        lawsuitsData[i] = { ...lawsuit }
      else
        lawsuitsData.splice(i, 1)
      closePanel()
      paginateLawsuitTable(lawsuitsData)
      // renderTableWithOptions()
    }

    deleteBtn.onclick = async () => {
      await deleteLawsuit(currentLawsuit.id ?? 0)
      showAlert("Processo deletado com sucesso.", "success")
      const idx = lawsuitsData.findIndex(c => c.id === currentLawsuit.id)
      lawsuitsData = lawsuitsData.splice(idx, 1)
      closePanel()
      paginateLawsuitTable(lawsuitsData)

      // renderTableWithOptions()
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
      //renderTableWithOptions()
      paginateLawsuitTable(lawsuitsData)

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
async function renderTable(data: Lawsuits[], holidays?: Holidays[], isElapsedDays = false, initialRender = false) {
  const table = document.getElementById("lawsuitTable");
  table?.replaceChildren()
  table!.innerHTML = "";
  const today = new Date()
  let initialDeadline = "", deadline = ""
  data.forEach((p: Lawsuits) => {
    let dates = { days: 0, deadline: new Date, isDueDate: false }
    if (p.initialDeadline && p.deadline) {
      const deadlineDateComponents = p.deadline.toString().split("-")
      const iDeadlineDateComponents = p.initialDeadline.toString().split("-")
      dates = getDeadline(new Date(today.getFullYear(), today.getMonth(), today.getDate()), new Date(Number(deadlineDateComponents[0]), Number(deadlineDateComponents[1]) - 1, Number(deadlineDateComponents[2])), holidays, isElapsedDays)
      initialDeadline = `<span>Inicial: ${iDeadlineDateComponents[2] + "/" + iDeadlineDateComponents[1] + "/" + iDeadlineDateComponents[0]}</span>`
      deadline = `<span>Final: ${deadlineDateComponents[2] + "/" + deadlineDateComponents[1] + "/" + deadlineDateComponents[0]}</span>`

    }


    const tr = document.createElement("tr");
    tr.dataset.id = p.id?.toString()
    tr.dataset.status = p.status
    const timeLeft = 23 - new Date().getHours() + " hora(s) e " + (60 - today.getMinutes()) + " minuto(s) restante(s)"
    const lawsuitNumber = `${p.number.substring(0, 7)}-${p.number.substring(7, 9)}.${p.number.substring(9, 13)}.${p.number[13]}.${p.number.substring(14, 16)}.${p.number.substring(16)}`
    tr.innerHTML = `
  
  <td>
    <button class="icon-btn summon" title="${p.summon ? "Ver intimação " + p.summon : ""}" data-URL=\"${p.summonURL}\"  ${p.summon ? "" : "disabled"}>
        <i class="bi bi-file-earmark"></i>
    </button>
    <button class="icon-btn view" title="Ver processo ${lawsuitNumber}">
        <i class="bi bi-eye"></i>
    </button>
    
    <button class="icon-btn edit" title="Editar processo ${lawsuitNumber}"">
        <i class="bi bi-pencil"></i>
    </button>
    <button class="icon-btn create-task" title="Criar tarefa">
        <i class="bi bi-plus"></i>
    </button>
     <button class="icon-btn view-tasks" title="Ver tarefas">
        <i class="bi bi-check2-square"></i>
    </button>
</td>
        <td>${p.status}</td>
        <td>${lawsuitNumber}</td>
        <td>${p.class}</td>
        <td>${p.circuit}</td>
        <td>${p.assisted.toUpperCase()} (${p.isDefendant ? "Passivo" : "Ativo"})</td>
        <td>
        ${!initialDeadline ? "Não definido" : initialDeadline}
        ${!deadline ? "Não definido" : deadline}
        </td>
        <td class="${getDeadlineClass(dates.days)}">
          ${dates.isDueDate ? "Prazo Perdido" : dates.days > 0 ? dates.days + " dia(s)" : timeLeft}
        </td>
        <td id="task-assigned-to">
        <label for="selectedWorker"class="filter-label">Responsável</label>
            <select name="selectedWorker" class="filter-select" id="assignedWorker">
              ${availableWorkers}
              </select>
        </td>
      `;



    const curDate = new Date()
    let lastWeekWorkingDay = new Date(curDate.setDate(curDate.getDate() - curDate.getDay() + 5));
    const isolastWeekWorkingDay = lastWeekWorkingDay.toISOString().split("T")
    lastWeekWorkingDay = new Date(isolastWeekWorkingDay[0] + "T03:00:00.000Z")
    const isoDeadline = new Date(p.deadline + "T03:00:00.000Z")
    tr.dataset.circuit = p.circuit
    tr.dataset.status = p.status
    tr.dataset.side = `${p.isDefendant ? "Passivo" : "Ativo"}`
    tr.dataset.dueToday = dates.days > 0 ? "false" : "true"
    tr.dataset.dueThisWeek = dates.days < 5 && lastWeekWorkingDay >= isoDeadline ? "true" : "false"
    tr.dataset.assisted = p.assisted
    tr.dataset.number = p.number
    if (initialRender && p.status === "Aguardando Abertura") tr.hidden = true
    const assignedToSelect = tr.querySelector("#task-assigned-to > select") as HTMLSelectElement
    const viewLawsuitButton = tr.querySelector("td > .icon-btn.view") as HTMLButtonElement
    const viewSummonButton = tr.querySelector("td > .icon-btn.summon") as HTMLButtonElement
    const editLawsuitButton = tr.querySelector("td > .icon-btn.edit") as HTMLButtonElement
    const createTaskButton = tr.querySelector("td > .icon-btn.create-task") as HTMLButtonElement
    const viewTasksButton = tr.querySelector("td > .icon-btn.view-tasks") as HTMLButtonElement

    viewLawsuitButton.onclick = async () => {
      await chrome.tabs.create({ url: "./src/pages/processo.html?numero=" + p.number })
    }
    viewSummonButton.onclick = (e) => {
      const summonBtn = e.target as HTMLButtonElement
      openIframeModal(summonBtn.parentElement?.dataset.url ?? "", "Intimação " + p.summon)
    }

    editLawsuitButton.onclick = () => {
      openPanel(p);
    }

    viewTasksButton.onclick = () => {
      goToPage(1)
      activeFilters.todoPage.number = p.number
      updateChipText()
    }

    createTaskButton.onclick = async () => {
      const workerId = Number(assignedToSelect.options.item(assignedToSelect.options.selectedIndex)?.value)
      await openEditModal({
        assignedTo: workersData.find(c => c.id === Number(workerId)) ?? workersData[0],
        title: p.summon ? `Manifestar sobre a intimação ${p.summon}` : "Manifestar sobre a intimação oculta",
        dueDate: addBusinessDays(new Date(), 2).toISOString().split("T")[0],
        status: "Não Iniciada",
        description: `${p.circuit}\n${p.number}\n${p.assisted}\nPrazo em dias ${p.givenDeadLine}\nPrazo final ${p.deadline}`,
        createdAt: new Date(),
        lawsuit: p
      })
    }


    assignedToSelect.onchange = async () => {
      const workerId = Number(assignedToSelect.options.item(assignedToSelect.options.selectedIndex)?.value)
      if (tr.dataset.task) {
        const task = tasksData.find(c => c.id)
        if (task) {
          assignedToSelect.options.item(0)?.value
          if (workerId) {
            const worker = workersData.find(c => c.id === workerId) ?? workersData[0]
            if (worker) {
              task.assignedTo = worker
              await sendMessage("UPDATE_TASK", { task })
              showToast("Tarefa atualizada com sucesso.")
            }

          }
        }
      } else {
        if (workerId)
          await openEditModal({
            assignedTo: workersData.find(c => c.id === Number(workerId)) ?? workersData[0],
            title: p.summon ? `Manifestar sobre a intimação ${p.summon}` : "Manifestar sobre a intimação oculta",
            dueDate: addBusinessDays(new Date(), 2).toLocaleString(),
            status: "Não Iniciada",
            description: `${p.circuit}\n${p.number}\n${p.assisted}\nPrazo em dias ${p.givenDeadLine}\nPrazo final ${p.deadline}`,
            createdAt: new Date(),
            lawsuit: p
          })
      }
    }

    const summon = tr.querySelector(".view-summon");
    summon?.addEventListener("click", (e) => {
      const summonBtn = e.target as HTMLButtonElement
      openIframeModal(summonBtn.dataset.url ?? "", "Intimação " + summonBtn.textContent)
    });

    table!.appendChild(tr);
    renderPagination()
    for (const task of tasksData) {
      if (p.number === task.lawsuit?.number) {
        const select = tr.querySelector("#assignedWorker") as HTMLSelectElement
        let isSelected = false
        for (const option of select.options) {
          if (option.label === task.assignedTo.name) {
            option.selected = true
            isSelected = true
            tr.dataset.task = String(task.id)
            break
          }

        }
        if (isSelected) break
      }
    }
  })


}


taskSearchInput.addEventListener("keyup", (e) => {
  const value = (e.target as HTMLInputElement).value
  activeFilters.todoPage.search = value
  updateChipText()

})


document.querySelector("#filterStatus2")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.todoPage.status = ""
    updateChipText()
  } else {
    activeFilters.todoPage.status = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterAssignedTo2")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  // const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.todoPage.assignedTo = ""
    updateChipText()
  } else {
    activeFilters.todoPage.assignedTo = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

filterTasksRowCount.addEventListener("change", () => {
  taskPageSize = Number(filterTasksRowCount[filterTasksRowCount.selectedIndex].label)
  paginateTasks(filteredTasks)
})


document.querySelector("#filterCircuit")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todas") {
    activeFilters.mainPage.circuit = ""
    updateChipText()
  } else {
    activeFilters.mainPage.circuit = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterStatus")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.mainPage.status = ""
    updateChipText()
  } else {
    activeFilters.mainPage.status = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterSide")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.mainPage.side = ""
    updateChipText()
  } else {
    activeFilters.mainPage.side = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector("#filterAssignedTo")?.addEventListener("change", (e) => {
  const select = e.target as HTMLSelectElement
  // const search = document.querySelector("#search") as HTMLInputElement
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.mainPage.assignedTo = ""
    updateChipText()
  } else {
    activeFilters.mainPage.assignedTo = select.selectedOptions.item(0)?.textContent!
    updateChipText()
  }
})

document.querySelector(".card.red")?.addEventListener("click", () => {
  activeFilters.mainPage.dueToday = true
  updateChipText()
})


document.querySelector(".card.yellow")?.addEventListener("click", () => {
  activeFilters.mainPage.dueThisWeek = true
  updateChipText()
})


document.querySelector(".card.green")?.addEventListener("click", () => {
  activeFilters.mainPage.finalized = true
  activeFilters.mainPage.status = "Finalizado"
  const filterStatusSelect = document.querySelector("#filterStatus") as HTMLSelectElement
  filterStatusSelect.selectedIndex = 2
  updateChipText()
})

document.querySelector("#redCard")?.addEventListener("click", () => {
  activeFilters.todoPage.dueToday = true
  updateChipText()
})

document.querySelector("#yellowCard")?.addEventListener("click", () => {
  activeFilters.todoPage.dueThisWeek = true
  updateChipText()
})






document.querySelector("#toggleable-actions")?.addEventListener("click", async () => {
  const items = document.querySelector(".nav-links") as HTMLElement
  if (items.children.item(0)?.className.includes("active"))
    openPanel()
  else if (items.children.item(1)?.className.includes("active")) await openEditModal()
  else {

  }
})


function updateCards() {
  let weekCount = 0, activeCount = 0, dueTodayCount = 0, activePage = 0
  const curDate = new Date()
  const friday = new Date(curDate);
  const monday = new Date(curDate)
  friday.setDate(curDate.getDate() - curDate.getDay() + 5);
  monday.setDate(curDate.getDate() - curDate.getDay() + 1);
  const lastWeekWorkingDay = new Date(friday.toISOString().split("T")[0] + "T03:00:00.000Z")
  const isoToday = new Date(new Date().toISOString().split("T")[0] + "T03:00:00.000Z")
  const navItems = document.querySelectorAll(".nav-item")
  if (navItems.item(1).className === "nav-item active") activePage = 1
  if (!activePage) {
    const selectedStatus = document.querySelector("#filterStatus") as HTMLSelectElement
    const doneCount = document.querySelector("#doneCount-p1")
    doneCount!.innerHTML = String(lawsuitsData.filter(c => c.status === "Finalizado").length)

    activeCount = lawsuitsData.filter(c => c.status === selectedStatus[selectedStatus.selectedIndex].label).length
    for (const lawsuit of filteredLawsuits) {
      if (lawsuit.deadline && lawsuit.status != "Finalizado") {
        const deadline = new Date(lawsuit.deadline + "T03:00:00.000Z")
        const midnightMonday = new Date(monday.toISOString().split("T")[0] + "T03:00:00.000Z")
        if (isoToday.toISOString().split("T")[0] === lawsuit.deadline ||
          isoToday > new Date(lawsuit.deadline + "T03:00:00.000Z") ||
          lawsuit.daysLeft === 0) dueTodayCount++
        if (midnightMonday >= deadline || deadline <= lastWeekWorkingDay) weekCount++
      }

    }

    if (selectedStatus[selectedStatus.selectedIndex].label === "Aberto" || selectedStatus[selectedStatus.selectedIndex].label === "Finalizado") {
      document.querySelector("#redLabel1")!.innerHTML = "Vencendo hoje"
      document.querySelector("#yellowLabel1")!.innerHTML = "Vencendo esta semana"
      document.querySelector("#blueLabel1")!.innerHTML = "Processos ativos"
    } else {
      document.querySelector("#redLabel1")!.innerHTML = "Abrindo hoje"
      document.querySelector("#yellowLabel1")!.innerHTML = "Abrindo esta semana"
      document.querySelector("#blueLabel1")!.innerHTML = "Processos pendentes de abertura"
    }


  }

  else {
    activeCount = tasksData.length
    const doneCount = document.querySelector("#doneCount-p2")
    doneCount!.innerHTML = String(tasksData.filter(c => c.status === "Concluida").length)

    for (const task of filteredTasks) {
      const dueDate = new Date(task.dueDate + "T03:00:00.000Z")
      const dates = getDeadline(new Date(), dueDate)
      if (isoToday.toISOString().split("T")[0] === task.dueDate || dates.days === 0) dueTodayCount++
      if (monday >= dueDate || dueDate <= lastWeekWorkingDay) weekCount++
    }
  }


  document.querySelector(`${activePage ? "#todayCount-p2" : "#todayCount-p1"}`)!.innerHTML = String(dueTodayCount)
  document.querySelector(`${activePage ? "#weekCount-p2" : "#weekCount-p1"}`)!.innerHTML = String(weekCount)
  document.querySelector(`${activePage ? "#activeCount-p2" : "#activeCount-p1"}`)!.innerHTML = String(activeCount)

}

function updateChipText() {
  if (activeFilters.mainPage.circuit)
    updateChips("circuit", "Vara: " + activeFilters.mainPage.circuit)
  else updateChips("circuit", "Vara: ")
  if (activeFilters.mainPage.status !== "")
    updateChips("status", "Status: " + activeFilters.mainPage.status)
  else updateChips("status", "Status: ")


  if (activeFilters.mainPage.side)
    updateChips("side", "Polo: " + activeFilters.mainPage.side)
  else updateChips("side", "Polo: ")

  if (activeFilters.mainPage.assignedTo)
    updateChips("assignedTo", "Atribuído a: " + activeFilters.mainPage.assignedTo)
  else updateChips("assignedTo", "Atribuído a: ")

  if (activeFilters.mainPage.finalized)
    updateChips("finalized", "Finalizado: Sim")
  else updateChips("finalized", "Finalizado: Não")
  if (activeFilters.mainPage.dueToday)
    updateChips("dueToday", "Vence hoje: Sim")
  else updateChips("dueToday", "Vence hoje: Não")

  if (activeFilters.mainPage.dueThisWeek)
    updateChips("dueThisWeek", "Vence essa semana: Sim")
  else updateChips("dueThisWeek", "Vence essa semana: Não")


  if (activeFilters.mainPage.class)
    updateChips("class", "Classe: " + activeFilters.mainPage.class)
  else updateChips("class", "Classe: ")
  if (activeFilters.mainPage.search)
    updateChips("searchLawsuit", "Pesquisa: " + activeFilters.mainPage.search)
  else updateChips("searchLawsuit", "Pesquisa: ")

  if (activeFilters.todoPage.dueToday)
    updateChips("dueToday2", "Vence hoje: Sim")
  else updateChips("dueToday2", "Vence hoje: Não")
  if (activeFilters.todoPage.finalized)
    updateChips("finalized2", "Finalizado: Sim")
  else updateChips("finalized2", "Finalizado: Não")
  if (activeFilters.todoPage.dueThisWeek)
    updateChips("dueThisWeek2", "Vence essa semana: Sim")
  else updateChips("dueThisWeek2", "Vence essa semana: Não")
  if (activeFilters.todoPage.assignedTo)
    updateChips("assignedTo2", "Atribuído a: " + activeFilters.todoPage.assignedTo)
  else updateChips("assignedTo2", "Atribuído a: ")
  if (activeFilters.todoPage.status)
    updateChips("status2", "Status: " + activeFilters.todoPage.status)
  else updateChips("status2", "Status: ")
  if (activeFilters.todoPage.circuit)
    updateChips("circuit2", "Vara: " + activeFilters.todoPage.circuit)
  else updateChips("circuit2", "Vara: ")
  if (activeFilters.todoPage.search)
    updateChips("searchTask", "Pesquisa: " + activeFilters.todoPage.search)
  else updateChips("searchTask", "Pesquisa: ")


  filterItems()
  updateCards()
}


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
      const fab = document.querySelector("#toggleable-actions") as HTMLButtonElement

      if (i === index) {
        if (index === 0 || index === 2) fab.hidden = true
        else fab.hidden = false
        document.querySelector("#toggleable-actions")
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });



    window.scrollTo({ top: 0, behavior: 'smooth' });

  }
}

async function openEditModal(task?: Tasks) {
  let officeWorkers = ""
  workersData.map(w => {
    officeWorkers += `<option value=${w.id} ${task?.assignedTo.id === w.id ? "selected" : ""}>${w.name}</option>\n`

  })
  renderModal().open({
    title: task?.id ? "Atualize sua tarefa" : "Crie sua tarefa",
    content: `
     <form id="taskForm" data-id=${task?.id}>
        <div class="form-group">
          <label for="number">Número do Processo</label>
          <input name="number" type="text" id="editNumber" value="${task?.lawsuit?.number ?? ""}"s>
        </div>
        <div class="form-group">
          <label for="title">Titulo da tarefa</label>
          <input name="title" type="text" id="editNumber" value="${task?.title ?? ""}">
        </div>
         <div class="form-group">
          <label for="description">Descrição da tarefa</label>
          <textarea name="description" rows="12">${task?.description ?? ""}</textarea>
        </div>
        ${task ? `<div class="form-group">
          <label for="status">Status</label>
          <select name="status" id="editSide">
            <option value="0">Não Iniciada</option>
            <option value="1">Em Andamento</option>
            <option value="2">Concluída</option>
            </option>Vencida</option>
          </select>
        </div>`: ``
      }
         <div class="form-group">
          <label for="dueDateInput">Prazo</label>
          <input id="dueDateInput" name="dueDate" type="date" max="2099-11-31" value="${task?.dueDate ? String(task?.dueDate) : ""}">
        </div>
        <div class="form-group">
          <label for="assignedTo">Responsável</label>
          <select name="assignedTo" id="editSide">
           ${officeWorkers}
          </select>        
        </div>  
        </form>
    
    `,
    actions: task?.id ? [
      { label: 'Deletar tarefa', className: 'btn-delete', callback: async () => await deleteTask() },
      { label: 'Atualizar tarefa', className: 'btn-primary', callback: async () => await saveTask(workersData, true), preventClose: true }
    ] : [
      { label: 'Salvar tarefa', className: 'btn-primary', callback: async () => await saveTask(workersData, false), preventClose: true }
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
  const today = new Date(new Date().toISOString().split("T")[0] + "T03:00:00.000Z")
  if (new Date(formFields["dueDate"] as string + "T03:00:00.000Z") < today || !formFields["dueDate"].toString()) {
    const dueDateInput = document.querySelector("#dueDateInput") as HTMLInputElement
    dueDateInput.focus()
    showToast("Data inválida.")
    return
  } else {
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
      const i = tasksData.findIndex(c => c.id === task.id)
      if (i > -1) {
        tasksData[i] = task;
        (document.querySelector(".modal-close") as HTMLButtonElement).click()
      }
    }
    else {
      await sendMessage("SAVE_TASK", { task })
      showAlert("Tarefa criada com sucesso.", "success")
      tasksData.push(task);
      (document.querySelector(".modal-close") as HTMLButtonElement).click()

    }

    await paginateTasks(tasksData)
  }
}


async function deleteTask() {
  const form = document.querySelector("#taskForm") as HTMLFormElement
  const id = parseInt(form.dataset.id ?? "")
  await sendMessage("DELETE_TASK", { id })
  showAlert("Tarefa deletada com sucesso.", "success")

  closeModal()

}

async function renderTasks(tasks: Tasks[]) {
  const todoList = document.querySelector(".todo-list") as HTMLElement

  todoList.innerHTML = tasks.map(t => {
    const today = new Date()
    const dateComponents = String(t.dueDate).split("-")
    let dates = { days: 0, deadline: new Date, isDueDate: false }
    dates = getDeadline(new Date(today.getFullYear(), today.getMonth(), today.getDate()), new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2])), [], false)
    const dueDate = (t?.dueDate as string).split("-")
    return `<div class="todo-item" data-task-id="${t.id}" data-title="${t.title.toUpperCase()}" data-case-number="${t.lawsuit?.number}" data-number="${t.lawsuit?.number}" data-assigned-to="${t.assignedTo.name}" data-status="${t.status}" data-circuit="${t.lawsuit?.circuit}" date-due-today="${dates.days > 1 ? "false" : "true"}">
              <div class="todo-header">
                <span class="todo-lawsuit">${t.lawsuit?.number}</span>
                <span class="badge ${t.status === "Não Iniciada" ?
        "warning" : t.status === "Em Andamento" ?
          "info" : t.status === "Concluida" ?
            "success" : "danger"}">${t.status}</span>
              </div>
              <div class="todo-body">
                <h3 class="todo-title">${t.title.toUpperCase()}</h3>
                <p class="todo-desc">${t.description.length > 100 ? t.description.substring(0, 99) + "..." : t.description}</p>
              </div>
              <div class="todo-footer">
                <div class="todo-info">
                  <span class="info-label">Responsável:</span>
                  <span class="info-value">${t.assignedTo ? t.assignedTo.name : ""}</span>
                </div>
                <div class="todo-info">
                  <span class="info-label">Prazo:</span>
                  <span class="info-value">${dueDate[2] + "/" + dueDate[1] + "/" + dueDate[0]}</span>
                </div>
              </div>
            </div> `
  }

  ).join("")

  for await (const task of tasksData) {
    const currentTask = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLDivElement
    if (currentTask)
      currentTask.onclick = async () => {
        await openEditModal(task)
      }
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

  const activeFilterBar = document.querySelectorAll(".active-filters") as NodeListOf<HTMLDivElement>;
  const mainPageFilterBar = activeFilterBar.item(0)
  const todoPageFilterBar = activeFilterBar.item(1)

  mainPageFilterBar.innerHTML = "";
  todoPageFilterBar.innerHTML = ""
  const mainPagefilters = [
    {
      key: "circuit",
      label: "Vara",
      value: activeFilters.mainPage.circuit
    },
    {
      key: "status",
      label: "Status",
      value: activeFilters.mainPage.status
    },
    {
      key: "side",
      label: "Polo",
      value: activeFilters.mainPage.side
    },
    {
      key: "assignedTo",
      label: "Responsável",
      value: activeFilters.mainPage.assignedTo
    },
    {
      key: "finalized",
      label: "Finalizado",
      value: activeFilters.mainPage.finalized ? "Sim" : "Não"
    },
    {
      key: "dueToday",
      label: "Vencendo hoje",
      value: activeFilters.mainPage.dueToday ? "Sim" : "Não"
    },
    {
      key: "dueThisWeek",
      label: "Vencendo esta semana",
      value: activeFilters.mainPage.dueThisWeek ? "Sim" : "Não"
    },
    {
      key: "searchLawsuit",
      label: "Pesquisa",
      value: (document.querySelector("#searchLawsuitInput") as HTMLInputElement).value
    },
    {
      key: "class",
      label: "Classe",
      value: activeFilters.mainPage.class
    },

  ];

  const todoPagefilters = [
    {
      key: "number",
      label: "Processo",
      value: activeFilters.todoPage.number
    },
    {
      key: "circuit2",
      label: "Vara",
      value: activeFilters.todoPage.circuit
    },
    {
      key: "assignedTo2",
      label: "Responsável",
      value: activeFilters.todoPage.assignedTo
    },
    {
      key: "finalized2",
      label: "Finalizado",
      value: activeFilters.todoPage.finalized ? "Sim" : "Não"
    },
    {
      key: "status2",
      label: "Status",
      value: activeFilters.todoPage.status
    },

    {
      key: "dueToday2",
      label: "Vencendo hoje",
      value: activeFilters.todoPage.dueToday ? "Sim" : ""
    },
    {
      key: "dueThisWeek2",
      label: "Vencendo esta semana",
      value: activeFilters.todoPage.dueThisWeek ? "Sim" : "Não"
    },
    {
      key: "searchTask",
      label: "Pesquisa",
      value: activeFilters.todoPage.search
    }
  ];



  for (const f of mainPagefilters) {
    const chip = document.createElement("div");
    chip.className = "filter-chip";
    chip.innerHTML = ` ${f.label}: ${f.value} <button data-key="${f.key}">&times;</button>`;
    mainPageFilterBar.appendChild(chip);
  }

  for (const f of todoPagefilters) {
    const chip = document.createElement("div");
    chip.className = "filter-chip";
    chip.innerHTML = ` ${f.label}: ${f.value} <button data-key="${f.key}">&times;</button>`;
    todoPageFilterBar.appendChild(chip);
  }



  if (mainPageFilterBar.children.length) {
    const clear = document.createElement("button");
    clear.className = "clear-filters";
    clear.textContent = "Limpar todos";
    clear.onclick = () => clearAllFilters(0);
    mainPageFilterBar.appendChild(clear);

  }

  if (todoPageFilterBar.children.length) {
    const clear = document.createElement("button");
    clear.className = "clear-filters";
    clear.textContent = "Limpar todos";
    clear.onclick = () => clearAllFilters(1);
    todoPageFilterBar.appendChild(clear);

  }

}

document.addEventListener("click", (e) => {

  const target = e.target as HTMLElement;

  if (!target.matches(".filter-chip button"))
    return;
  let pageNumber = 0
  const activePage = document.querySelectorAll(".nav-item")
  if (activePage.item(1).className === "nav-item active") pageNumber = 1
  const key = target.dataset.key!;

  if (!pageNumber) {

    switch (key) {

      case "circuit":
        activeFilters.mainPage.circuit = "";
        (document.querySelector("#filterCircuit") as HTMLSelectElement).selectedIndex = 0;
        break;

      case "status":
        activeFilters.mainPage.status = "Aberto";
        (document.querySelector("#filterStatus") as HTMLSelectElement).selectedIndex = 0;
        break;

      case "side":
        activeFilters.mainPage.side = "";
        (document.querySelector("#filterSide") as HTMLSelectElement).selectedIndex = 0;
        break;

      case "assignedTo":
        activeFilters.mainPage.assignedTo = "";
        (document.querySelector("#filterAssignedTo") as HTMLSelectElement).selectedIndex = 0;
        break;
      case "finalizad":
        activeFilters.mainPage.finalized = false;
        break;

      case "class":
        activeFilters.mainPage.class = "";
        (document.querySelector("#filterClass") as HTMLSelectElement).selectedIndex = 0;
        break;

      case "dueToday":
        activeFilters.mainPage.dueToday = false;
        break;
      case "dueThisWeek":
        activeFilters.mainPage.dueThisWeek = false;
        break;
      case "search":
        activeFilters.mainPage.search = "";
        break;
    }

  } else if (pageNumber === 1) {
    switch (key) {
      case "number":
        activeFilters.todoPage.number = "";
        break;
      case "circuit2":
        activeFilters.todoPage.circuit = "";
        (document.querySelectorAll("section")[1].querySelector("#filterCircuit2") as HTMLSelectElement).selectedIndex = 0;
        break;

      case "status2":
        activeFilters.todoPage.status = "";
        (document.querySelectorAll("section")[1].querySelector("#filterStatus2") as HTMLSelectElement).selectedIndex = 0;
        break;
      case "finalizad2":
        activeFilters.todoPage.finalized = false;
        break;

      case "assignedTo2":
        activeFilters.todoPage.assignedTo = "";
        (document.querySelectorAll("section")[1].querySelector("#filterAssignedTo2") as HTMLSelectElement).selectedIndex = 0;
        break;
      case "dueToday2":
        activeFilters.todoPage.dueToday = false;
        break;
      case "dueThisWeek2":
        activeFilters.todoPage.dueThisWeek = false;
        break;
      case "searchTask":
        activeFilters.todoPage.search = "";
        break;


    }
  }
  updateChipText();

  renderActiveFilters();

});

function clearAllFilters(page: number) {

  if (!page) {
    activeFilters.mainPage.circuit = "";
    activeFilters.mainPage.status = "Aberto";
    activeFilters.mainPage.side = "";
    activeFilters.mainPage.assignedTo = "";
    activeFilters.mainPage.dueToday = false;
    activeFilters.mainPage.dueThisWeek = false;
    activeFilters.mainPage.class = "";
    activeFilters.mainPage.finalized = false;

    document.querySelectorAll("select").forEach(s => {
      if (s.id === "filterStatus")
        s.selectedIndex = 1
      else
        s.selectedIndex = 0
    });
  }
  else {
    activeFilters.todoPage.number = "";
    activeFilters.todoPage.circuit = "";
    activeFilters.todoPage.status = "";
    activeFilters.todoPage.finalized = false;
    activeFilters.todoPage.assignedTo = "";
    activeFilters.todoPage.dueToday = false;
    activeFilters.todoPage.dueThisWeek = false;
    activeFilters.todoPage.search = "";
  }
  updateChipText();

  renderActiveFilters();

}

