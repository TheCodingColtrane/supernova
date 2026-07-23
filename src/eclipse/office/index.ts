import type { DefendersAPIResponse } from "../types/office"
import type { Worker } from "../types/workers"
import { convertTextDateToDate, formatDate, getUserCredentials, isSmallerDateValid, isValidDate, sendMessage } from "../utils";
import { showToast } from "../utils/ui";
import cities from "../utils/municipios.json"
import { formatISO } from "date-fns";
import { localDateToIsoDate } from "../utils/date";
const defendersSelect = document.querySelector("#defenderSelect") as HTMLSelectElement
const defenderSelect = document.getElementById('defenderSelect') as HTMLSelectElement;
const defenderLocale = document.getElementById('defenderLocale') as HTMLSelectElement;
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
const isCriminal = document.querySelector("#isCriminal") as HTMLInputElement
const minasGeraisCities = cities.filter(c => c.codigo_uf === 31)
// const internContractInfoDiv = document.querySelector("#internContractInfo") as HTMLDivElement
const subordinateStartDate = document.querySelector("#subordinateStartDate") as HTMLInputElement
const subordinateEndDate = document.querySelector("#subordinateEndDate") as HTMLInputElement
const date = new Date()
let districtCourt = ""
const workers: Worker[] = []
const ids: string[] = []
const firstPageUserData = { id: 0, nome: "", roles: Array<any>(), email: "", districtCourt: "", isCriminal: false, locality: { id: 0, name: "" } }
let defendersData: DefendersAPIResponse
let selectedId = ""
const user = await getUserCredentials()
const { data } = await sendMessage("GET_WORKERS", {})
if (data && user) {
    console.log(data)
    workers.push(...data)
}

(async () => {
    try {
        const defenders = fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=true&limit=1000")
        const cookie = chrome.cookies.get({ url: "https://solar.defensoria.mg.def.br/atendimento/perfil/", name: "user" })
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
                if (user && user.id === d.id) {
                    opt.selected = true
                    defendersSelect.disabled = true
                }
            })
            minasGeraisCities.forEach(c => {
                const option = document.createElement("option")
                option.value = String(c.codigo_ibge)
                option.innerHTML = c.nome
                defenderLocale.options.add(option)
                if (user && user.locality.id === c.codigo_ibge) option.selected = true

            })
            if (user) {
                defenderEmailInput.value = user.email

            }
        } else if (response[0].status === 401) {
            alert("Você precisa entrar no Solar. Você será redirecionado ao site.")
            window.open("https://solar.defensoria.mg.def.br/login/", "_self")
        }
    } catch (error) {
        console.log(error)
    }
})()


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
    if (val && email) {
        defendersArea.style.display = "none"
        registrationArea.style.display = 'block';
        cardHeader.style.display = "block"
        firstPageUserData.id = Number(val)
        firstPageUserData.nome = defenderSelect.selectedOptions[0]?.label,
            firstPageUserData.roles = defendersData.results.find(c => c.id === Number(val))?.atuacoes as any
        firstPageUserData.email = email,
            firstPageUserData.districtCourt = districtCourt
        firstPageUserData.locality.name = defenderLocale.selectedOptions[0]?.label
        firstPageUserData.locality.id = Number(defenderLocale.selectedOptions[0]?.value)
        if (workers.length === 0) {
            workers.push({
                name: defenderSelect.selectedOptions[0]?.label ?? "",
                defenderId: Number(val),
                email,
                joinedAt: new Date(),
                role: "Defensor(a)",
                id: 1,
                isActive: true,
                isCriminal: isCriminal.value === "on"
            })
            ids.push(val)
            updateList(ids)
        } else {
            updateList(workers.map(c => String(c.id)))
        }


    }
});

function updateList(idList: string[]) {

    subList.innerHTML = workers.map((sub, i: number) => `
      <div class="subordinate-item" data-order=${i}>
        <div class="subordinate-info">
          <span class="subordinate-name" data-id='${idList[i]}'>${sub.name}</span>
          <span class="subordinate-role">${sub.role}</span>
          <span class="subordinate-email">${sub.email}</span>
           <span class="subordinate-start">${sub.startDate ? localDateToIsoDate(String(sub.startDate), false) : ""}</span>
          <span class="subordinate-end">${sub.endDate ? localDateToIsoDate(String(sub.endDate), false) : ""}</span>
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
            console.log(elements)
            const roleSelectText = elements?.item(1).innerHTML
            if (roleSelectText === "Estagiário(a)") {
                roleSelect.selectedIndex = 0
                const subName = document.querySelector("#subordinateName")
                if(subName?.tagName === "SELECT") {
                const defenders = document.createElement("input")
                defenders.value  = elements?.item(0).textContent ?? ""
                defenders.id = "subordinateName"
                subName?.replaceWith(defenders)    
                } else {
                (document.querySelector("#subordinateName")! as HTMLInputElement).value = elements?.item(0).textContent ?? ""

                }
            }
            else if (roleSelectText === "Servidor(a)"){
               roleSelect.selectedIndex = 1
                const subName = document.querySelector("#subordinateName")
                if(subName?.tagName === "SELECT") {
                const defenders = document.createElement("input")
                defenders.value = elements?.item(0).textContent ?? ""
                defenders.id = "subordinateName"
                subName?.replaceWith(defenders)
            } else {
                (document.querySelector("#subordinateName")! as HTMLInputElement).value = elements?.item(0).textContent ?? ""
            }
        }
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
                    if (d.nome === elements?.item(0).textContent)
                        opt.selected = true

                })
                subName?.replaceWith(defenders)
                console.log(elements?.item(0))
                getSelectedIndexOption(elements?.item(0).dataset.id ?? "-1")
                subEmailInput.value = elements?.item(2).innerHTML ?? ""

                return

            }
            subEmailInput.value = elements?.item(2).innerHTML ?? ""
            subNameInput.value = elements?.item(0).innerHTML ?? ""
            subordinateStartDate.value = elements?.item(3).innerHTML ?? ""
            subordinateEndDate.value = elements?.item(4).innerHTML ?? ""
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
    let startDate = "", endDate = ""

    if (subordinateStartDate.value) {
        if (!isValidDate(subordinateStartDate.value)) {
            showToast("Campo data de inicio inválido.")
            subordinateStartDate.focus()
            return
        }
        startDate = formatISO(convertTextDateToDate(subordinateStartDate.value), {representation: "date"}  )

    }
    if (subordinateEndDate.value) {
        if (!isValidDate(subordinateEndDate.value)) {
            showToast("Campo data fim inválido.")
            subordinateEndDate.focus()
            return
        }
        endDate = formatISO(convertTextDateToDate(subordinateEndDate.value), {representation: "date"})
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
        id: workers.length + 1, startDate, endDate, isActive: true, isCriminal: isCriminal.value === "on"
    })
    subEmailInput.value = ''
    updateList(ids);
})

finishBtn?.addEventListener("click", async () => {
    const defender = defendersData.results.findIndex(c => c.id === firstPageUserData.id)
    if (defender > -1 && defendersData.results) {
        if (defendersData.results[defender]) {
            defendersData.results[defender].trabalhadores = workers
            if (firstPageUserData && !user) {
                if (await sendMessage("SAVE_WORKER", { workers })) {
                    localStorage.setItem("user",
                        JSON.stringify({
                            ...firstPageUserData
                        }))
                    alert("Cadastro realizado com sucesso")
                    await chrome.tabs.create({ url: "./src/pages/gabinete.html" })
                    window.close()
                }
            } else if (firstPageUserData && user) {
                if (await sendMessage("UPDATE_WORKER", { workers })) {
                    localStorage.setItem("user",
                        JSON.stringify({
                            ...firstPageUserData
                        }))
                    alert("Equipe atualizada com sucesso")
                    await chrome.tabs.create({ url: "./src/pages/gabinete.html" })
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
