import type { Holidays } from "./db/schemas/holidays";
import type { HolidaysAPIResponse } from "./types/holidays";
import type { Defenders, DefendersAPIResponse } from "./types/defenders";

export async function sendMessage<T>(message: string, data: T) {
    try {
        console.log("oi")
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





export function extractTableData<T>(table: HTMLTableElement, props: T) {
    const tbody = table.tBodies[0];
    if (!tbody) return [];
    const tableHeaders = Object.keys(props as object);
    const tableData = [];

    for (const row of tbody.rows) {
        // 1. Create a clone to avoid object reference issues
        const rowData = { ...props };
        let i = 0;
        for (const cell of row.cells) {
            const header = tableHeaders[i];
            if (typeof header === "string") {
                // 2. Map cell content
                rowData[header as keyof T] = cell.innerText as any;
                i++;
            }
        }
        tableData.push(rowData);
    }
    return tableData;
}


/**
 * Busca os feriados da API feriados.
 * @param {Date} oldestLawsuitDeadline 
 * @returns {Promise<Holidays[]> | []}
 */
export async function getHolidaysAPI(oldestYear: number) {
    try {
        const curYear = new Date().getFullYear()
        let holidays = []
        if (curYear - oldestYear > 0) {
            for (let year = oldestYear; year <= curYear; year++) {
                let holiday = fetch("https://brasilapi.com.br/api/feriados/v1/" + year)
                holidays.push(holiday)
            }
            const allHolidays = await Promise.all(holidays)
            holidays = []
            for (const holiday of allHolidays) {
                if (holiday.status === 200) holidays.push(holiday.json())
            }
            const holidaysResponse = await Promise.all(holidays) as HolidaysAPIResponse[]
            return holidaysResponse
        }

        const holidaysResponse = await fetch("https://brasilapi.com.br/api/feriados/v1/" + curYear)
        if (holidaysResponse.status === 200) return await holidaysResponse.json() as Holidays[]

    } catch (error) {
        console.log(error)
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