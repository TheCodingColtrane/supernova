import type { Lawsuits } from "../types/lawsuits"
import { sendMessage } from "../utils"
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
  const tds = document.getElementById("processTable")
  tds?.replaceChildren()
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
async function renderTable(data: Lawsuits[]) {
  const table = document.getElementById("processTable");
  table!.innerHTML = "";

  data.forEach((p: Lawsuits) => {
    let dates = { businessDays: 0, deadline: new Date }
    if (p.initialDeadline && p.deadline)
      dates = getBusinessDays(new Date(), new Date(p.deadline))
    const tr = document.createElement("tr");
    console.log(p.number, p.deadline)
    tr.innerHTML = `
        <td>${p.number}</td>
        <td>${p.circuit}</td>
        <td>${p.assisted}</td>
        <td><span class="badge ${getStatusClass(p.status)}">${p.status}</span></td>
        <td>${p.isDefendant ? "Passivo" : "Ativo"}</td>
        <td>${!p.deadline ? "Não definido" : new Date(p.deadline).toLocaleDateString()}</td>
        <td class="${getDeadlineClass(dates.businessDays)}">
          ${dates.businessDays}
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
      }
    }
  } catch (error) {
    console.error(error)
  }
})


