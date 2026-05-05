"use strict";

// src/core/controller/defenders.ts
var url = new URLSearchParams(document.location.search);
var defenderSelect = document.getElementById("defenderSelect");
var defenderEmailInput = document.getElementById("defenderEmail");
var registrationArea = document.getElementById("registrationArea");
var subNameInput = document.getElementById("subordinateName");
var subRoleInput = document.querySelector("#roleSelect");
var subEmailInput = document.querySelector("#subordinateEmail");
var finishBtn = document.getElementById("finishBtn");
var saveBtn = document.getElementById("saveBtn");
var btnNextStep = document.getElementById("btnNextStep");
var defendersArea = document.getElementById("defenders-area");
var subList = document.getElementById("subList");
var workers = [];
document.addEventListener("DOMContentLoaded", async (e) => {
  try {
    const onboard = url.get("onboard");
    url.getAll("onboard");
    if (onboard === "1") {
      const response = await fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=false&limit=1000");
      if (response.ok) {
        const data = await response.json();
        const defendersSelect = document.querySelector("#defenderSelect");
        data.results.map((d, i) => {
          let opt = document.createElement("option");
          opt.value = d.id.toString();
          opt.textContent = d.nome;
          defendersSelect.add(opt);
        });
        localStorage.setItem("defenders", JSON.stringify(data.results));
      }
    } else {
      defendersArea.style.display = "none";
      registrationArea.style.display = "block";
      const userCreds = localStorage.get("user");
      if (userCreds) {
        const user = JSON.parse(userCreds);
        const defenders = JSON.parse(localStorage.getItem("defenders") ?? "");
        const defender = defenders.find((c) => c.id === user.id);
        if (defender) {
          workers.push(...defender.trabalhadores);
        }
      }
    }
  } catch (error) {
  }
});
btnNextStep.addEventListener("click", async () => {
  const val = defenderSelect.value;
  const email = defenderEmailInput.value;
  if (val && email && url.get("onboard") === "1") {
    defendersArea.style.display = "none";
    registrationArea.style.display = "block";
    localStorage.setItem(
      "user",
      JSON.stringify({ id: Number(val), nome: defenderSelect.selectedOptions[0]?.label })
    );
    workers.push({
      name: defenderSelect.selectedOptions[0]?.label ?? "",
      defenderId: Number(val),
      email,
      joinedAt: /* @__PURE__ */ new Date(),
      role: "Defensor(a)"
    });
    updateList();
  }
});
function updateList() {
  const subs = [];
  if (workers.length === 0) {
    subList.innerHTML = '<div class="empty-state">Nenhum subordinado vinculado a este gestor.</div>';
    return;
  }
  subList.innerHTML = workers.map((sub, i) => `
      <div class="subordinate-item" >
        <div class="subordinate-info">
          <span class="subordinate-name">${sub.name}</span>
          <span class="subordinate-role">${sub.role}</span>
          <span class="subordinate-email">${sub.email}</span>
        </div>
        <span class="delete-sub-btn" style="color: var(--success); font-size: 0.7rem; font-weight: 700;" data-id="subordinate-${i}">X</span>
      </div>
    `).join("");
  for (let sub of document.querySelectorAll(".subordinate-item")) {
    sub.addEventListener("click", (e) => {
      const items = e.target;
      if (items.children.length > 1) {
        subNameInput.value = items.children.item(0)?.children.item(0)?.textContent ?? "";
        const role = items.children.item(0)?.children.item(1)?.textContent;
        if (role === "Estagi\xE1rio(a)") subRoleInput.selectedIndex = 0;
        else if (role === "Servidor(a)") subRoleInput.selectedIndex = 1;
        else subRoleInput.selectedIndex = 2;
        subEmailInput.value = items.children.item(0)?.children.item(2)?.textContent ?? "";
      }
    });
  }
  for (let sub of document.querySelectorAll(".delete-sub-btn")) {
    sub.addEventListener("click", (e) => {
      const subItems = e.target;
      let itemIdx = parseInt(subItems.dataset.id?.split("-")[1] ?? "");
      if (subs.length === 1) itemIdx -= subs.length;
      if (subs.length <= itemIdx) itemIdx -= 1;
      subs.splice(itemIdx, 1);
      const items = document.querySelectorAll(".subordinate-item");
      items.item(itemIdx).remove();
    });
  }
}
saveBtn?.addEventListener("click", () => {
  const name = subNameInput.value.trim().toUpperCase();
  const role = subRoleInput.selectedOptions?.item(0)?.innerHTML;
  const email = subEmailInput?.value;
  const defenderId = Number(defenderSelect.value);
  if (!name) return alert("Digite o nome do funcion\xE1rio.");
  workers.push({
    name,
    email,
    defenderId,
    role: role === "Estagi\xE1rio(a)" ? "Estagi\xE1rio(a)" : role === "Servidor(a)" ? "Servidor(a)" : "Defensor(a)",
    joinedAt: /* @__PURE__ */ new Date()
  });
  subNameInput.value = "";
  subEmailInput.value = "";
  subRoleInput.selectedIndex = 0;
  updateList();
});
finishBtn?.addEventListener("click", (e) => {
  const user = JSON.parse(localStorage.getItem("user") ?? "");
  if (user) {
    const defenders = JSON.parse(localStorage.getItem("defenders") ?? "");
    const defender = defenders.findIndex((c) => c.id === user.id);
    if (defender > -1 && defenders) {
      if (defenders[defender]) {
        defenders[defender].trabalhadores = workers;
        localStorage.setItem("defenders", JSON.stringify(defenders));
        alert("Cadastro realizado com sucesso. Abra novamente a extens\xE3o.");
        window.close();
      }
    }
  }
});
//# sourceMappingURL=defenders.js.map
