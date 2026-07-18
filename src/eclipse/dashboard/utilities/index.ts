import { convertTextDateToDate, isValidDate, renderModal } from "../../utils";
import { getBusinessDays } from "../../utils/date";
import { showToast } from "../../utils/ui";

const utilities = [
    {
        id: "calculadora",
        name: "Calculadora de Prazos",
        description: "Calcula prazos processuais.",
        icon: "bi-calculator",
        category: "Processual",
        page: "",
        favorite: true,
        execute: openDeadlineCalculator
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

    const grids = document.querySelectorAll(".utilities-grid") as NodeListOf<HTMLDivElement>

    utilities.forEach(util => {
        grids[util.favorite ? 0 : 1].innerHTML += `
        <div class="utility-card" data-id="${util.id}">
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
       <button class="btn-open">
        Abrir
       </button>
    </div>
</div>
    `;

        const card = grids[util.favorite ? 0 : 1].querySelector(`.utility-card[data-id="${util.id}"]`) as HTMLDivElement;
        const button = card.querySelector(".btn-open") as HTMLButtonElement;
        button.onclick = async () => {
            if (util.page)
                await chrome.tabs.create({ url: "./src/pages/" + util.page })
            else
                if (typeof util.execute === "function") util.execute()

        }
    });
}


export function openDeadlineCalculator() {
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
           <div class="form-group">
            <label>Considerar Feriados</label>
            <input type="checkbox" id="checkHolidays">
          </div>
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
                    if (isValidDate(rawEarlierDate) && isValidDate(rawEndDate)) {
                        const earlierDate = convertTextDateToDate(rawEarlierDate)
                        const endDate = convertTextDateToDate(rawEndDate)
                        if (Number(earlierDate) < Number(endDate)) {
                            let dates = { days: 0, deadline: new Date, isDueDate: false }
                            dates = getBusinessDays(earlierDate, endDate)
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

