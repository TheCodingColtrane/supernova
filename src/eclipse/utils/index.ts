import type { Holidays } from "../db/schemas/holidays";
import type { HolidaysAPIResponse } from "../types/holidays";
import type { Defenders, DefendersAPIResponse } from "../types/office";
import type { User } from "../types/user";
import type { ModalBody } from "../types/modal";

export async function sendMessage<T>(message: string, data: T) {
    try {
        console.log("sending message", message, data)
        const response = await chrome.runtime.sendMessage({ type: message, payload: data });
        // Verifica se houve erro na resposta
        if (response?.success === false) {
            console.error("Erro no SW:", response.error);
            throw new Error(response.error);
        }

        return response;
    } catch (error) {
        // Captura erros de conexão ou serialização
        console.error("Falha ao enviar mensagem para SW:", error);

        // Dica: chrome.runtime.lastError pode ter mais detalhes
        if (chrome.runtime.lastError) {
            console.error("Detalhe do erro:", chrome.runtime.lastError.message);
        }

        throw error;
    }
}


/**
 * Busca os feriados da API feriados.
 * @param {Date} oldestLawsuitDeadline 
 * @returns {Promise<Holidays[]> | []}
 */
export async function getHolidaysAPI(oldestYear: number) {
    try {
        const curYear = new Date().getFullYear()
        let holidays: Array<Promise<Response>> = []
        if (curYear - oldestYear > 0) {
            for (let year = oldestYear; year <= curYear; year++) {
                let holiday = fetch("https://brasilapi.com.br/api/feriados/v1/" + year.toString())
                holidays.push(holiday)
            }
            const allHolidays = await Promise.all(holidays)
            holidays = []
            for (const holiday of allHolidays) {
                if (holiday.status === 200) holidays.push(await holiday.json())
            }
            return holidays.flatMap(c => c) as unknown as HolidaysAPIResponse[]
        }

        const holidaysResponse = await fetch("https://brasilapi.com.br/api/feriados/v1/" + curYear.toString())
        if (holidaysResponse.status === 200) return await holidaysResponse.json() as Holidays[]

    } catch (error) {
        console.log(error)
    }
}

export async function getLocalHolidays() {
    type LocalHoliday = { data: string, nome: string, tipo: string, descricao: string, uf: string, codigo_ibge: number }
    let statusCode = 404 | 500
    let date: Date = new Date()
    let failureCount = 0, year = date.getFullYear()
    while (statusCode === 404 || statusCode === 500) {
        const local = fetch(`https://raw.githubusercontent.com/joaopbini/feriados-brasil/refs/heads/master/dados/feriados/municipal/json/${date.getFullYear()}.json`)
        const department = fetch(`https://raw.githubusercontent.com/joaopbini/feriados-brasil/refs/heads/master/dados/feriados/estadual/json/${date.getFullYear()}.json`)
        const response = await Promise.all([local, department])
        if (response[0].ok && response[1].ok) {
            let localHolidays = await response[0].json() as Array<LocalHoliday>
            let departmentHolidays = await response[0].json() as Array<LocalHoliday>
            departmentHolidays = departmentHolidays.filter(c => c.uf === "MG")
            localHolidays = localHolidays.filter(c => c.uf === "MG")
            const holidays = new Array<LocalHoliday>()
            holidays.push(...localHolidays)
            holidays.push(...departmentHolidays)
            return localHolidays

        } else if (response[0].status === 404 || response[0].status === 500) {
            failureCount++
            year -= failureCount
        }

        if(failureCount === 5)
            return
    }


}

export async function getDefendersAPI() {
    try {
        const response = await fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=true&limit=1000")
        return await response.json() as DefendersAPIResponse
    } catch (error) {
        console.log(error)
    }

}

export async function getDefenders() {
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
    let data = await chrome.storage.local.get("nextUpdate") as any
    // se o armazenamento não retornar nada, é populado um objeto sem props. Desta forma, é necessário a verificação abaixo. 
    if (!Object.hasOwn(data, "nextUpdate") || Date.now() >= data.nextUpdate) {
        const currentDefenders = await getDefendersAPI()
        if (currentDefenders) {
            await chrome.storage.local.set({
                defenders: currentDefenders.results,
                cacheVersion: "1.0",
                nextUpdate: Date.now() + THIRTY_DAYS
            })
            return currentDefenders.results
        }
        return
    }

    data = await chrome.storage.local.get("defenders")
    return data.defenders as Defenders[]

}

export async function getUserCredentials() {
    const creds = JSON.parse(localStorage.getItem("user") ?? "{}")
    if (Object.hasOwn(creds, "id")) return creds as User
    await chrome.tabs.create({ url: "./src/pages/equipe.html?onboard=1" })
}

export async function getWorkers() {
    const crendentials = await getUserCredentials()
    if (crendentials) {
        const defenders = JSON.parse(localStorage.getItem("defenders") ?? "{}") as Defenders[]
        if (defenders) {
            return defenders.find(c => c.id === crendentials.id)?.trabalhadores
        }
    }
}


export function renderTable<T>(headers: string[], data: T[]) {
    const table = document.createElement("table");
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    for (let header of headers) {
        let th = document.createElement("th");
        th.innerHTML = header;
        headerRow.appendChild(th);
    }

    const tbody = table.createTBody();
    for (let row of data) {
        let currentRow = tbody.insertRow();
        const rowValues = Object.values(row as object);
        for (let i = 0; i < headers.length; i++) {
            let cell = currentRow.insertCell();
            cell.innerHTML = rowValues[i] !== undefined ? String(rowValues[i]) : "";
        }
    }
    document.body.appendChild(table);
}


export function renderModal() {

    return {
        el: document.getElementById('customModal') as HTMLElement,
        title: document.getElementById('modalTitle') as HTMLElement,
        closeBtn: document.querySelector(".modal-close") as HTMLElement,
        body: document.getElementById('modalBody') as HTMLElement,
        footer: document.getElementById('modalFooter') as HTMLElement,

        open(options: ModalBody) {
            // 1. Define o Título
            this.title.innerText = options.title || 'Alerta';

            // 2. Define o Conteúdo (Pode ser HTML ou String)
            this.body.innerHTML = options.content || '';

            // 3. Define os Botões do Rodapé
            this.footer.innerHTML = ''; // Limpa botões anteriores
            const buttonPanel = document.createElement("div")
            buttonPanel.className = "panel-actions"
            buttonPanel.style.marginTop = "0"
            if (options.actions) {
                options.actions.forEach((action: any) => {

                    const btn = document.createElement('button');
                    btn.innerText = action.label;
                    btn.className = action.className || 'btn-primary';
                    btn.onclick = () => {
                        action.callback();
                        if (!action.preventClose) this.close();
                    };
                    buttonPanel.appendChild(btn)
                });

                this.footer.appendChild(buttonPanel);

            }

            // 4. Exibe o Modal
            this.el.classList.add('active');

            // UX: Fechar ao clicar fora
            this.el.onclick = (e) => {
                if (e.target === this.el) this.close();
            };

            this.closeBtn.addEventListener("click", () => {
                this.close()
            })
        },

        close() {
            this.el.classList.remove('active');
        }
    }
};

export function formatDate(input: HTMLInputElement) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
    }

    if (value.length > 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }
    input.value = value;
}

export function convertTextDateToDate(date: string) {
    const dateParts = date.split("/").map(c => parseInt(c))
    return new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
}

export function convertDateToTextDate(date: Date) {
    return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear()
}


export function isValidDate(date: string): boolean {
    const matches = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
    if (matches == null) {
        return false;
    }
    const day = Number(matches[1]);
    const month = Number(matches[2]) - 1;
    const year = Number(matches[3]);
    const data = new Date(year, month, day);
    return data.getDate() == day && data.getMonth() == month && data.getFullYear() == year
}

export function isSmallerDateValid(date1: string, date2: string) {
    const smallerDate = convertTextDateToDate(date1)
    const biggerDate = convertTextDateToDate(date2)
    if (smallerDate.getTime() < biggerDate.getTime())
        return true
    else return false
}