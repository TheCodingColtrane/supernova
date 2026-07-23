import type { Holidays } from "../../types/holidays";
import { convertTextDateToDate, isValidDate, renderModal, sendMessage } from "../../utils";
import { getBusinessDays } from "../../utils/date";
import { showToast } from "../../utils/ui";

const utilities = [
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
        description: "Exporta realtórios dos processuais em docx, pdf e json.",
        icon: "bi-download",
        category: "Administração",
        page: "",
        favorite: true,
        execute: openReportsModal
    },
     {
        id: "prompts",
        name: "Prompts",
        description: "prompts do Gemini para aumentar a produtividade.",
        icon: "bi-chat",
        category: "Produtividade",
        page: "",
        favorite: true,
        execute: openGeminiPromptsModal
    },
    {
        id: "feriados",
        name: "Gestão de Feriados",
        description: "Cadastro e manutenção de feriados.",
        icon: "bi-calendar-event",
        category: "Cadastros",
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
            <input name="earlierDate" type="text" id="earlierDate">
          </div>
          <div class="form-group">
            <label>Data Posterior</label>
            <input name="endDate" type="text" id="endDate">
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
                    console.log(isElapsedDays, holidaysChk, holidays)
                    if (isValidDate(rawEarlierDate) && isValidDate(rawEndDate)) {
                        const earlierDate = convertTextDateToDate(rawEarlierDate)
                        const endDate = convertTextDateToDate(rawEndDate)
                        if (Number(earlierDate) < Number(endDate)) {
                            let dates = { days: 0, deadline: new Date, isDueDate: false }
                            dates = getBusinessDays(earlierDate, endDate, holidaysChk ? holidays : undefined, isElapsedDays ? true : false)
                            document.querySelector("#result")!.innerHTML = "Resultado " + String(dates.days) + " dias."
                        }
                    } else {
                        showToast("Uma das datas está inválida.")
                        return
                    }
                }
            }
        ]
    })

}

function openReportsModal(){
    renderModal().open({
        title: "Exporte relatório",
        content: `
       <form id="deadlineForm">
          <div class="form-group">
            <label>Data anterior</label>
             <select name="status" id="editStatus">
              <option value="0">docx</option>
              <option value="1">pdf</option>
              <option value="2">json</option>
             </select>          
             </div>
        </form>
      
      `,
        actions: [
            {
                label: 'Salvar tarefa', className: 'btn-primary', preventClose: true, callback: () => {
                    const form = document.querySelector("#deadlineForm") as HTMLFormElement
                    const formData = new FormData(form)
                    console.log(formData)
                }
            }
        ]
    })

}

function openGeminiPromptsModal(){

}

