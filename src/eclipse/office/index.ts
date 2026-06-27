import type { Defenders, DefendersAPIResponse } from "../types/office"
import type { User } from "../types/user";
import type { Worker } from "../types/workers"
import { convertDateToTextDate, convertTextDateToDate, formatDate, getUserCredentials, isSmallerDateValid, isValidDate, sendMessage } from "../utils";
import { showToast } from "../utils/ui";
const url = new URLSearchParams(document.location.search)
const defendersSelect = document.querySelector("#defenderSelect") as HTMLSelectElement
const defenderSelect = document.getElementById('defenderSelect') as HTMLSelectElement;
const defenderEmailInput = document.getElementById('defenderEmail') as HTMLInputElement;
const registrationArea = document.getElementById('registrationArea') as HTMLElement;
let subNameInput = document.getElementById('subordinateName') as HTMLInputElement | HTMLSelectElement;
const subRoleInput = document.querySelector("#roleSelect") as HTMLSelectElement
const subEmailInput = document.querySelector("#subordinateEmail") as HTMLInputElement
const finishBtn = document.getElementById('finishBtn');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');
const cardHeader = document.querySelector(".card-header") as HTMLDivElement
const btnNextStep = document.getElementById('btnNextStep') as HTMLButtonElement;
const defendersArea = document.getElementById("defenders-area") as HTMLElement
const subList = document.getElementById('subList') as HTMLElement;
const roleSelect = document.querySelector("#roleSelect") as HTMLSelectElement
// const internContractInfoDiv = document.querySelector("#internContractInfo") as HTMLDivElement
const subordinateStartDate = document.querySelector("#subordinateStartDate") as HTMLInputElement
const subordinateEndDate = document.querySelector("#subordinateEndDate") as HTMLInputElement
const date = new Date()
let districtCourt = ""
const workers: Worker[] = []
const ids: string[] = []
let defendersData: DefendersAPIResponse
let selectedId = ""
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const onboard = url.get("onboard")
        url.getAll("onboard")
        if (onboard === "1") {
            const defenders = fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=true&limit=1000")
            const cookie = chrome.cookies.get({url: "https://solar.defensoria.mg.def.br/atendimento/perfil/", name: "user"})
            const response = await Promise.all([defenders, cookie])
            if (response[0].ok && response[1]?.value) {
                const rawCookies = response[1].value.substring(7).replaceAll("\\", "")
                const endJurisdictionPos = rawCookies.indexOf("}") - 1
                districtCourt = rawCookies.substring(rawCookies.indexOf("comarca") + 11, endJurisdictionPos)                
                if (!districtCourt) {
                    alert("Você precisa entrar no Solar. Você será redirecionado ao site.")
                    window.open("https://solar.defensoria.mg.def.br/login/", "_self")
                }
                defendersData = await response[0].json() as DefendersAPIResponse
                defendersData.results.map((d) => {
                    let opt = document.createElement("option")
                    opt.value = d.id.toString()
                    opt.textContent = d.nome
                    defendersSelect.add(opt)
                })
                localStorage.setItem("defenders", JSON.stringify(defendersData.results))


            } else if (response[0].status === 401) {
                alert("Você precisa entrar no Solar. Você será redirecionado ao site.")
                window.open("https://solar.defensoria.mg.def.br/login/", "_self")
            } else {

            }
        } else {
            defendersArea.style.display = "none"
            registrationArea.style.display = 'block';
            const userCreds = localStorage.get("user")
            if (userCreds) {
                const user = JSON.parse(userCreds) as User
                const defenders = JSON.parse(localStorage.getItem("defenders") ?? "") as Defenders[]
                const defender = defenders.find(c => c.id === user.id)
                if (defender) {
                    workers.push(...defender.trabalhadores)
                }
            }
        }

    } catch (error) {
        console.log(error)
    }
})


subordinateStartDate.addEventListener("keyup", (e) => {
    const startDate = e.target as HTMLInputElement
    startDate.placeholder = date.getDate() + "/" + date.getMonth() + 1 + "/" + date.getFullYear()
    formatDate(startDate)
})

subordinateEndDate.addEventListener("keyup", (e) => {
    const endDate = e.target as HTMLInputElement
    endDate.placeholder = date.getDate() + "/" + date.getMonth() + 1 + "/" + date.getFullYear() + 2
    formatDate(endDate)
})


btnNextStep.addEventListener('click', async () => {
    const val = defenderSelect.value;
    const email = defenderEmailInput.value
    if (val && email && url.get("onboard") === "1") {
        defendersArea.style.display = "none"
        registrationArea.style.display = 'block';
        cardHeader.style.display = "block"
        localStorage.setItem("user",
            JSON.stringify({
                id: Number(val),
                nome: defenderSelect.selectedOptions[0]?.label,
                roles: defendersData.results.find(c => c.id === Number(val))?.atuacoes,
                email, districtCourt
            }))
        workers.push({
            name: defenderSelect.selectedOptions[0]?.label ?? "",
            defenderId: Number(val),
            email,
            joinedAt: new Date(),
            role: "Defensor(a)",
            id: 1,
            isActive: true
        })
        ids.push(val)
        updateList(ids)

    }
});

function updateList(idList: string[]) {

    subList.innerHTML = workers.map((sub, i: number) => `
      <div class="subordinate-item" data-order=${i}>
        <div class="subordinate-info">
          <span class="subordinate-name" data-id='${idList[i]}'>${sub.name}</span>
          <span class="subordinate-role">${sub.role}</span>
          <span class="subordinate-email">${sub.email}</span>
           <span class="subordinate-start">${sub.startDate ? convertDateToTextDate(sub.startDate) : ""}</span>
          <span class="subordinate-end">${sub.endDate ? convertDateToTextDate(sub.endDate) : ""}</span>
        </div>
       <div>
        <button class="edit-sub-btn" style="color: #f59e0b; font-size: 0.7rem; font-weight: 700;">Editar</button>
        <button class="delete-sub-btn" style="color: #ef4444; font-size: 0.7rem; font-weight: 700;">Deletar</button>
       </div>
      </div>
    `).join('');

    for (let sub of document.querySelectorAll(".delete-sub-btn")) {
        sub.addEventListener("click", (e) => {
            const subItems = e.target as HTMLElement
            const currentWorker = subItems.parentElement?.parentElement
            const order = parseInt(currentWorker?.dataset.order ?? "-1")
            if (order !== -1) {
                currentWorker?.remove()
                workers.splice(order, 1)
                const idList = Array.from<HTMLDivElement>(document.querySelectorAll(".subordinate-name")).map(c => c.dataset.id!)
                if (workers.length > 0) updateList(idList)
                else backBtn?.click()
            }

        })

    }

    for (let sub of document.querySelectorAll(".edit-sub-btn")) {
        sub.addEventListener("click", (e) => {
            const subItems = e.target as HTMLDivElement
            const elements = subItems.parentElement?.parentElement?.querySelectorAll("span")
            const roleSelectText = elements?.item(1).innerHTML
            if (roleSelectText === "Estagiário(a)") roleSelect.selectedIndex = 0
            else if (roleSelectText === "Servidor(a)") roleSelect.selectedIndex = 1
            else {
                roleSelect.selectedIndex = 2
                const subName = document.querySelector("#subordinateName")
                const defenders = document.createElement("select")
                defenders.innerHTML = "Selecione o defensor"
                defenders.id = "subordinateName"
                defendersData.results.map((d) => {
                    let opt = document.createElement("option")
                    opt.value = d.id.toString()
                    opt.textContent = d.nome
                    defenders.add(opt)
                })
                subName?.replaceWith(defenders)
                console.log(elements?.item(0))
                getSelectedIndexOption(elements?.item(0).dataset.id ?? "-1")
                subEmailInput.value = elements?.item(2).innerHTML ?? ""

                return

            }
            subEmailInput.value = elements?.item(2).innerHTML ?? ""
            subNameInput.value = elements?.item(0).innerHTML ?? ""
            return

        })

    }


}
saveBtn?.addEventListener('click', () => {
    subNameInput = document.getElementById('subordinateName') as HTMLInputElement | HTMLSelectElement;
    let name = ""
    let idx = ""
    if (roleSelect.selectedIndex == 2 && subNameInput instanceof HTMLSelectElement) {
        name = subNameInput?.selectedOptions?.item(0)?.innerHTML ?? ""
        idx = subNameInput.options.item(subNameInput.selectedIndex)?.value ?? ""
        if (!selectedId) getSelectedIndexOption(idx)
        else ids.push(idx)

    }
    else {
        name = subNameInput.value.trim().toUpperCase()
        subNameInput.value = '';

    }
    const role = subRoleInput.selectedOptions?.item(0)?.innerHTML
    const email = subEmailInput?.value
    const defenderId = Number(defenderSelect.value);
    let startDate = new Date(), endDate = new Date()

    if (subordinateStartDate.value) {
        if (!isValidDate(subordinateStartDate.value)) {
            showToast("Campo data de inicio inválido.")
            subordinateStartDate.focus()
            return
        }
        startDate = convertTextDateToDate(subordinateStartDate.value)

    }
    if (subordinateEndDate.value) {
        if (!isValidDate(subordinateEndDate.value)) {
            showToast("Campo data fim inválido.")
            subordinateEndDate.focus()
            return
        }
        endDate = convertTextDateToDate(subordinateEndDate.value)
    }

    if (!isSmallerDateValid(subordinateStartDate.value, subordinateEndDate.value)) {
        showToast("Campo data de inicio maior que data fim.")
        subordinateStartDate.focus()
        return
    }




    if (!name) return alert("Digite o nome do funcionário.");
    workers.push({
        name, email, defenderId, role: role === "Estagiário(a)" ? "Estagiário(a)" :
            role === "Servidor(a)" ? "Servidor(a)" : "Defensor(a)", joinedAt: new Date(),
        id: workers.length + 1, startDate, endDate, isActive: true
    })
    subEmailInput.value = ''
    updateList(ids);
})

finishBtn?.addEventListener("click", async () => {
    const user = await getUserCredentials()
    if (user) {
        const defenders = JSON.parse(localStorage.getItem("defenders") ?? "") as Defenders[]
        const defender = defenders.findIndex(c => c.id === user.id)
        if (defender > -1 && defenders) {
            if (defenders[defender]) {
                defenders[defender].trabalhadores = workers
                if (await sendMessage("SAVE_WORKER", { workers })) {
                    localStorage.setItem("defenders", JSON.stringify(defenders))
                    alert("Cadastro realizado com sucesso. Abra novamente a extensão.")
                    window.close()
                }

            }


        }

    }
})

backBtn?.addEventListener("click", () => {
    const subs = document.querySelectorAll(".subordinate-item")
    workers.splice(0, workers.length)
    subs.forEach(s => s.remove())
    registrationArea.style.display = "none";
    defendersArea.style.display = "block";
    cardHeader.style.display = "none"
});


roleSelect.addEventListener("change", () => {
    if (roleSelect.selectedIndex === 2) {
        const subName = document.querySelector("#subordinateName")
        const defenders = document.createElement("select")
        defenders.innerHTML = "Selecione o defensor"
        defenders.id = "subordinateName"
        defendersData.results.map((d) => {
            let opt = document.createElement("option")
            opt.value = d.id.toString()
            opt.textContent = d.nome
            defenders.add(opt)
        })
        defenders.selectedIndex = 0
        subName?.replaceWith(defenders)
    } else {
        const subName = document.querySelector("#subordinateName")
        if (subName?.tagName === "SELECT") {
            const name = document.createElement("input")
            name.id = "subordinateName"
            name.setAttribute("type", "text")
            subName.replaceWith(name)

        }
    }

    // if(roleSelect.selectedIndex > 0)  internContractInfoDiv.style.display = "none"
    // else internContractInfoDiv.style.display = "block"
})


function getSelectedIndexOption(value: string) {
    const options = document.querySelector("#subordinateName")?.querySelectorAll("option")
    let i = 0
    if (options)
        for (const option of options) {
            console.log(value)
            if (option.value === value) {
                option.selected = true
                return
            }
            i++
        }
}