import type { Defenders, DefendersAPIResponse } from "../types/defenders"
import type { User } from "../types/user";
import type { Worker } from "../types/workers"
import { getUserCredentials } from "../utils";
const url = new URLSearchParams(document.location.search)
const defenderSelect = document.getElementById('defenderSelect') as HTMLSelectElement;
const defenderEmailInput = document.getElementById('defenderEmail') as HTMLInputElement;
const registrationArea = document.getElementById('registrationArea') as HTMLElement;
const subNameInput = document.getElementById('subordinateName') as HTMLInputElement;
const subRoleInput = document.querySelector("#roleSelect") as HTMLSelectElement
const subEmailInput = document.querySelector("#subordinateEmail") as HTMLInputElement
const finishBtn = document.getElementById('finishBtn');
const saveBtn = document.getElementById('saveBtn');
const btnNextStep = document.getElementById('btnNextStep') as HTMLButtonElement;
const defendersArea = document.getElementById("defenders-area") as HTMLElement
const subList = document.getElementById('subList') as HTMLElement;
const workers: Worker[] = []


document.addEventListener("DOMContentLoaded", async (e) => {
    try {
        const onboard = url.get("onboard")
        url.getAll("onboard")
        if (onboard === "1") {
            const response = await fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=false&limit=1000")
            if (response.ok) {
                const data = await response.json() as DefendersAPIResponse
                const defendersSelect = document.querySelector("#defenderSelect") as HTMLSelectElement
                data.results.map((d, i) => {
                    let opt = document.createElement("option")
                    opt.value = d.id.toString()
                    opt.textContent = d.nome
                    defendersSelect.add(opt)
                })
                localStorage.setItem("defenders", JSON.stringify(data.results))
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

    }
})



btnNextStep.addEventListener('click', async () => {
    const val = defenderSelect.value;
    const email = defenderEmailInput.value
    if (val && email && url.get("onboard") === "1") {
        defendersArea.style.display = "none"
        registrationArea.style.display = 'block';
        localStorage.setItem("user",
            JSON.stringify({ id: Number(val), nome: defenderSelect.selectedOptions[0]?.label }))
        workers.push({
            name: defenderSelect.selectedOptions[0]?.label ?? "",
            defenderId: Number(val),
            email,
            joinedAt: new Date(),
            role: "Defensor(a)"
        })
        updateList()

    }
});

function updateList() {
    // const subs = database["1"] || [];
    const subs: Worker[] = [];
    if (workers.length === 0) {
        subList.innerHTML = '<div class="empty-state">Nenhum subordinado vinculado a este gestor.</div>';
        return;
    }

    subList.innerHTML = workers.map((sub, i: number) => `
      <div class="subordinate-item" >
        <div class="subordinate-info">
          <span class="subordinate-name">${sub.name}</span>
          <span class="subordinate-role">${sub.role}</span>
          <span class="subordinate-email">${sub.email}</span>
        </div>
        <span class="delete-sub-btn" style="color: var(--success); font-size: 0.7rem; font-weight: 700;" data-id="subordinate-${i}">X</span>
      </div>
    `).join('');

    for (let sub of document.querySelectorAll(".subordinate-item")) {
        sub.addEventListener("click", (e) => {
            const items = e.target as HTMLElement
            if (items.children.length > 1) {
                subNameInput.value = items.children.item(0)?.children.item(0)?.textContent ?? ""
                const role = items.children.item(0)?.children.item(1)?.textContent
                if (role === "Estagiário(a)") subRoleInput.selectedIndex = 0
                else if (role === "Servidor(a)") subRoleInput.selectedIndex = 1
                else subRoleInput.selectedIndex = 2
                subEmailInput.value = items.children.item(0)?.children.item(2)?.textContent ?? ""
            }

        })
    }
    for (let sub of document.querySelectorAll(".delete-sub-btn")) {
        sub.addEventListener("click", (e) => {
            const subItems = e.target as HTMLElement
            let itemIdx = parseInt(subItems.dataset.id?.split("-")[1] ?? "")
            if (subs.length === 1) itemIdx -= subs.length
            if (subs.length <= itemIdx) itemIdx -= 1
            subs.splice(itemIdx, 1)

            const items = document.querySelectorAll(".subordinate-item")
            items.item(itemIdx).remove()
        })

    }

}
saveBtn?.addEventListener('click', () => {
    const name = subNameInput.value.trim().toUpperCase();
    const role = subRoleInput.selectedOptions?.item(0)?.innerHTML
    const email = subEmailInput?.value
    const defenderId = Number(defenderSelect.value);
    if (!name) return alert("Digite o nome do funcionário.");
    workers.push({
        name, email, defenderId, role: role === "Estagiário(a)" ? "Estagiário(a)" :
            role === "Servidor(a)" ? "Servidor(a)" : "Defensor(a)", joinedAt: new Date()
    })
    subNameInput.value = '';
    subEmailInput.value = ''
    subRoleInput.selectedIndex = 0
    updateList();
})

finishBtn?.addEventListener("click", async (e) => {
    const user = await getUserCredentials()
    if (user) {
        const defenders = JSON.parse(localStorage.getItem("defenders") ?? "") as Defenders[]
        const defender = defenders.findIndex(c => c.id === user.id)
        if (defender > -1 && defenders) {
            if (defenders[defender]) {
                defenders[defender].trabalhadores = workers
                localStorage.setItem("defenders", JSON.stringify(defenders))
                alert("Cadastro realizado com sucesso. Abra novamente a extensão.")
                window.close()
            }


        }

    }
})