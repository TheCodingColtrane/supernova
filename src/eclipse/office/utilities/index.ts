import { writeJSON, writeDOCX } from "../../reports";
import type { Holidays } from "../../types/holidays";
import type { Lawsuits } from "../../types/lawsuits";
import { getLawsuit, renderModal, sendMessage } from "../../utils";
import { getDeadline } from "../../utils/date";
import { hideLoadingSpinner, showLoadingSpinner, showToast } from "../../utils/ui";

const utilities = [
    {
        id: "Processo",
        name: "Ver Processo",
        description: "Permite a visualização de processos presentes no SOLAR.",
        icon: "bi-search",
        category: "Produtividade",
        page: "",
        favorite: true,
        execute: openLawsuit
    },
    {
        id: "calculadora",
        name: "Calculadora de Prazos",
        description: "Calcula prazos processuais.",
        icon: "bi-calculator",
        category: "Produtividade",
        page: "",
        favorite: true,
        execute: openDeadlineCalculator
    },
    {
        id: "relatórios",
        name: "Exportar relatórios",
        description: "Exporta relatórios dos processuais em docx, pdf e json.",
        icon: "bi-download",
        category: "Administração",
        page: "",
        favorite: true,
        execute: openReportsModal
    },
    {
        id: "preferências",
        name: "Preferências",
        description: "Define as preferências do usuário para a personalização da plataforma.",
        icon: "bi-gear",
        category: "Administração",
        page: "",
        favorite: true,
        execute: openPreferencesModal
    },
    {
        id: "feriados",
        name: "Gestão de Feriados",
        description: "Cadastro e manutenção de feriados.",
        icon: "bi-calendar-event",
        category: "Produtividade",
        page: "feriados.html",
        favorite: false,
        execute: null
    },
    {
        id: "equipe",
        name: "Gestão da Equipe",
        description: "Usuários, setores e permissões.",
        icon: "bi-people",
        category: "Administração",
        page: "equipe.html",
        favorite: false,
        execute: null
    }
];


export function renderUtilities() {
    const grids = document.querySelectorAll(".utilities-grid") as NodeListOf<HTMLDivElement>;

    utilities.forEach(util => {
        const targetGrid = grids[util.favorite ? 0 : 1];

        // 1. Criamos um elemento container para o card
        const card = document.createElement("div");
        card.className = "utility-card";
        card.setAttribute("data-id", util.id);

        // 2. Definimos o conteúdo interno do card
        card.innerHTML = `
            <div class="utility-top">
                <div class="utility-icon">
                    <i class="bi ${util.icon}"></i>
                </div>
                <div class="utility-badges">
                    <span class="utility-category">
                        ${util.category}
                    </span>
                </div>
            </div>
            <div class="utility-content">
                <h3 class="utility-title">
                    ${util.name}
                </h3>
                <p class="utility-description">
                    ${util.description}
                </p>
            </div>
            <div class="utility-footer">
               <button class="btn-open">Abrir</button>
            </div>
        `;

        // 3. Adicionamos o card na grid sem sobrescrever o resto do HTML
        targetGrid.appendChild(card);

        // 4. Vinculamos o evento no botão com segurança
        const button = card.querySelector(".btn-open") as HTMLButtonElement;
        button.onclick = async () => {
            if (util.page) {
                await chrome.tabs.create({ url: "./src/pages/" + util.page });
            } else if (typeof util.execute === "function") {
                util.execute();
            }
        };
    });
}


async function openDeadlineCalculator() {
    const { data } = await sendMessage("GET_HOLIDAYS", {})
    const holidays = data as Holidays[]
    renderModal().open({
        title: "Calcule seu prazo",
        content: `
       <form id="deadlineForm">
          <div class="form-group">
            <label>Data anterior</label>
            <input id="earlierDate" name="earlierDate" type="date" max="2099-11-31">
          </div>
          <div class="form-group">
            <label>Data Posterior</label>
            <input id="endDate" name="endDate" type="date" max="2099-11-31">
          </div>
            <input type="checkbox" id="holidaysChk" name="isHolidays">
            <label for="holidaysChk">Considerar Feriados</label>
           <input type="checkbox" id="elapsedDaysChk" name="isElapsedDays">
            <label for="elapsedDaysChk">Considerar dias corridos</label>
          <div id="result" style="display: flex; justify-content: center; align-items: center; margin: 1rem 0;">

          </div>
        </form>
      
      `,
        actions: [
            {
                label: 'Salvar tarefa', className: 'btn-primary', preventClose: true, callback: () => {
                    const form = document.querySelector("#deadlineForm") as HTMLFormElement
                    const formData = new FormData(form)
                    const rawEarlierDate = formData.get("earlierDate") as string
                    const rawEndDate = formData.get("endDate") as string
                    const holidaysChk = formData.get("isHolidays") as string
                    const isElapsedDays = formData.get("isElapsedDays") as string
                    const earlierDate = new Date(rawEarlierDate + "T03:00:00.000Z")
                    const endDate = new Date(rawEndDate + "T03:00:00.000Z")
                    if (earlierDate < endDate) {
                        let dates = { days: 0, deadline: new Date, isDueDate: false }
                        dates = getDeadline(earlierDate, endDate, holidaysChk ? holidays : undefined, isElapsedDays ? true : false)
                        document.querySelector("#result")!.innerHTML = "Resultado " + String(dates.days) + " dias."
                    } else {
                        showToast("Uma das datas está inválida.")
                        return
                    }
                }
            }
        ]
    })

}

function openReportsModal() {
    renderModal().open({
        title: "Exporte relatório",
        content: `
       <form id="reportForm">
          <div class="form-group">
            <label>Formato do arquivo</label>
             <select name="file" id="fileExtension">
              <option value="0">Word (docx)</option>
              <option value="1">PDF</option>
              <option value="2">JSON</option>
             </select>          
             </div>
        </form>
      
      `,
        actions: [
            {
                label: 'Gerar Arquivo', className: 'btn-primary', preventClose: true, callback: async () => {
                    const form = document.querySelector("#reportForm") as HTMLFormElement
                    const formData = new FormData(form)
                    const fileType = formData.get("file")
                    const lawsuitsData = await sendMessage("GET_PENDING_LAWSUITS", {}) as any
                    const lawsuits = lawsuitsData.data as Lawsuits[]
                    if (fileType === "0") {
                        await writeDOCX(lawsuits)
                    } else if (fileType === "1") {

                    } else {
                        writeJSON(lawsuits)
                    }
                }
            }
        ]
    })

}

function openPreferencesModal() {
    renderModal().open({
        title: "Gestão dos seus prazos",
        content: `
       <form id="customDeadlinePreferencesForm">
          <div class="form-group">
            <label for="highest">Maior prioridade</label>
             <input type="number" name="highest" required placeholder="Tudo que for menor ou igual ao valor fornecido será pintado de vermelho"/>
          </div>
          <div class="form-group">
             <label for="highest">Alta prioridade</label>
             <input type="number" name="high" required placeholder="Tudo que for menor ou igual ao valor fornecido será pintado de laranja"/>
          </div>
          <div class="form-group">
             <label for="medium">Média prioridade</label>
             <input type="number" name="medium" required placeholder="Tudo que for menor ou igual ao valor fornecido será pintado de amarelo"/>
          </div>
          <div class="form-group">
             <label for="low">Baixa prioridade</label>
             <input type="number" name="low" required placeholder="Tudo que for menor ou igual ao valor fornecido será pintado de azul"/>
          </div>
          <div class="form-group">
             <label for="lowest">Menor prioridade</label>
             <input type="number" name="lowest" required placeholder="Tudo que for superior ou igual ao valor fornecido será pintado de verde"/>
          </div>
        </form>
      
      `,
        actions: [
            {
                label: 'Salvar preferência', className: 'btn-primary', preventClose: false, callback: async () => {
                    const form = document.querySelector("#customDeadlinePreferencesForm") as HTMLFormElement
                    const formData = new FormData(form)
                    const preferences = {
                        office: {
                            deadlinesPriorities: {
                                highest: Number(formData.get("highest") as string),
                                high: Number(formData.get("high") as string),
                                medium: Number(formData.get("medium") as string),
                                low: Number(formData.get("low") as string),
                                lowest: Number(formData.get("lowest") as string),
                            }
                        }
                    }
                    localStorage.setItem("preferences", JSON.stringify(preferences))
                    showToast("Preferência salva com sucesso!")
                }
            }
        ]
    })

}

async function openLawsuit() {
    renderModal().open({
        title: "Digite o número do seu processo",
        content: `
       <form id="lawsuitForm">
          <div class="form-group">
            <label for="lawsuitNumber">Processo</label>
             <input name="number" class="search-input" id="lawsuitNumber" minlength="20" maxlength="25"/>
             </div>
            <div id="result" style="display: flex; justify-content: center; align-items: center; margin: 1rem 0; color:red;">
        </form>
      
      `,
        actions: [
            {
                label: 'Pesquisar', className: 'btn-primary', preventClose: true, callback: async () => {
                    const form = document.querySelector("#lawsuitForm") as HTMLFormElement
                    const formData = new FormData(form)
                    const rawLawsuitNumber = formData.get("number") as string
                    if (rawLawsuitNumber) {
                        if (rawLawsuitNumber.length < 20 || rawLawsuitNumber.length > 20 && rawLawsuitNumber.length < 25) return
                        const lawsuitNumber = rawLawsuitNumber.replace(/\D/g, "").trim()
                        if (!isNaN(Number(lawsuitNumber))) {
                            showLoadingSpinner()
                            const lawsuit = await getLawsuit(lawsuitNumber)
                            if (lawsuit?.sucesso) {
                                document.querySelector("#lawsuitForm > #result")!.textContent = ""
                                await chrome.tabs.create({ url: "./src/pages/processo.html?numero=" + lawsuitNumber });
                                hideLoadingSpinner()
                            } else {
                                document.querySelector("#lawsuitForm > #result")!.textContent = "Não foi encontrado nenhum processo. Cadastre-o no solar ou pesquise por outro."
                                hideLoadingSpinner()

                            }
                        } else {
                            document.querySelector("#lawsuitForm > #result")!.textContent = "Número do processo inválido."
                            hideLoadingSpinner()
                        }
                    }

                }
            }
        ]
    })

}