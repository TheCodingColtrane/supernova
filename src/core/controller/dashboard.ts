import { formatISO } from "../../../node_modules/date-fns/formatISO";
import type { Holidays, HolidaysAPIResponse } from "../types/holidays";
import type { Lawsuits } from "../types/lawsuits"
import { getHolidaysAPI, sendMessage } from "../utils"
import { getBusinessDays } from "../utils/date";


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
(async function () {
  const lawsuits = sendMessage("GET_PENDING_LAWSUITS", {}) as any
  const holidays = sendMessage("GET_HOLIDAYS", {}) as any
  const results = await Promise.all([lawsuits, holidays])
  const holidaysData = results[1].data as Holidays[]
  const lawsuitsData = results[0].data as Lawsuits[]
  const circuits = new Set("")

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
    select!.appendChild(select!);
  })

  sessionStorage.setItem("lawsuits", JSON.stringify(lawsuitsData))

}())

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
    let dates = { days: 0, deadline: new Date }
    if (p.initialDeadline && p.deadline)
      dates = getBusinessDays(new Date(), new Date(p.deadline), holidays, isElapsedDays)
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
          ${dates.days}
        </td>
        <td>${Array.isArray(p.defender) ? "Defensores da vara" : p.defender.nome}</td>
      `;

    //   tr.onclick = () => alert("Abrir processo: " + p.number);

    table!.appendChild(tr);
  })
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


        document.querySelector("#checkHolidays")?.addEventListener("click", async (e) => {
          let holidays = sessionStorage.getItem("holidays")
          if (!holidays) {
            let result = await sendMessage("GET_HOLIDAYS", { year: new Date() }) as any
            if (!result.data) {
              const year = new Date().getFullYear()
              const hasHolidays = lawsuits.some(x =>
                new Date().getFullYear() < year ||
                new Date(x.deadline as string).getFullYear() < year
              )
              const holidaysResult = await getHolidaysAPI(hasHolidays ? (year - 1) : year)
              if (hasHolidays) {
                const holidays = holidaysResult as HolidaysAPIResponse[]
                let { data } = await sendMessage("SAVE_HOLIDAYS", { holidays, year: hasHolidays ? (year - 1) : year }) as any
                if (data.success) sessionStorage.setItem("holidays", JSON.stringify(data))
              } else {
                const holidays = holidaysResult as Holidays[]
                let { data } = await sendMessage("SAVE_HOLIDAYS", { holidays, year }) as any
                if (data.success) sessionStorage.setItem("holidays", JSON.stringify(data))
              }
              const isElapsedDays = document.querySelector("#checkCalendarDays") as HTMLInputElement
              const input = e.target as HTMLInputElement
              if (input.checked as any) {
                const data = JSON.parse(sessionStorage.getItem("holidays")!) as Holidays[]
                renderTable(lawsuits, data, isElapsedDays.checked)
              }
            } else {
              const isElapsedDays = document.querySelector("#checkCalendarDays") as HTMLInputElement
              const data = JSON.parse(sessionStorage.getItem("holidays")!) as Holidays[]
              renderTable(lawsuits, data, isElapsedDays.checked)
            }
          }
        })

        document.querySelector("#checkCalendarDays")?.addEventListener("click", (e) => {
          const isElapsedDaysInput = e.target as HTMLInputElement
          const holidaysData = JSON.parse(sessionStorage.getItem("holidays")!) as Holidays[]
          if (isElapsedDaysInput.checked) {
            return renderTable(data, holidaysData ? holidaysData : [], true)
          }
          return renderTable(data, holidaysData ? holidaysData : [], false)
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

