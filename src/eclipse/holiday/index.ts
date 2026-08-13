import { formatISO } from "date-fns";
import type { Holidays } from "../types/holidays";
import { sendMessage } from "../../util";
import { showToast } from "../utils/ui";
let holidaysData = Array<Holidays>();


(async () => {
    const holidays = await sendMessage("GET_HOLIDAYS", {}) as any
    holidaysData = holidays.data as Holidays[]
    const years: string[] = []
    const uniqueYears = new Set("")
    holidaysData.map(c => {
        const startDateComponents = String(c.startDate).split("-")
        const endDateComponents = String(c.endDate).split("-")
        if (!uniqueYears.has(startDateComponents[0])) {
            uniqueYears.add(startDateComponents[0])
            years.push(startDateComponents[0])
        }

        else if (!uniqueYears.has(endDateComponents[0])) {
            uniqueYears.add(endDateComponents[0])
            years.push(endDateComponents[0])

        }

    })

    const yearFilterSelect = document.querySelector("#yearFilter") as HTMLSelectElement
    let curholiday = 0
    for (const year of years) {
        const option = document.createElement("option")
        option.value = year
        option.textContent = year
        yearFilterSelect.options.add(option)
        if(curholiday === years.length - 1)
            option.selected = true
        else curholiday++
    }

    yearFilterSelect.addEventListener("click", () => {
        const selectedOpt = yearFilterSelect.item(yearFilterSelect.selectedIndex)?.value
        renderHolidays(selectedOpt!)
    })

    const currentDate = new Date()
    const lastDayYear = new Date(Number(yearFilterSelect.options.item(curholiday)?.value), 11, 31)
    if(currentDate < lastDayYear){
        const newYear = currentDate.getFullYear()
       const response =  await fetch("https://brasilapi.com.br/api/feriados/v1/" + 2027)
       if(response.ok){
            const data = await response.json() as Holidays[]
            if(data.length > 0){
                data.push({startDate: String(newYear) + "-12-20", endDate: String(newYear) + "-01-20", name: "Recesso Forense", type: "national" })
                const result = await sendMessage("SAVE_HOLIDAYS", {holidays: data})
                if(result.data){
                     showToast("Feriados cadastrados com sucesso.")
                     years.push(String(newYear))
                     holidaysData.push(...data)
                     window.location.reload()
                }
            }

       }
    }



    renderHolidays(years[years.length - 1])
})()


function renderHolidays(year = "") {
    const holidayList = document.querySelector(".holiday-list")
    let holidayCount = 0

    holidayList!.innerHTML = holidaysData.map((c, i) => {
        const rawStartDate = String(c.startDate).split("-")
        const startDate = rawStartDate[2] + "/" + rawStartDate[1] + "/" + rawStartDate[0]
        const rawEndDate = String(c.endDate).split("-")
        const endDate = rawEndDate[2] + "/" + rawEndDate[1] + "/" + rawEndDate[0]
        if (rawStartDate[0] === year && rawEndDate[0] === year) {
            holidayCount++
            return `<div class=${!i ? "holiday-item" : "holiday-item active"} data-id=${c.id} data-type=${c.type} data-name=${c.name}>
            <div class="holiday-icon ${c.type === "national" ? "national" : c.type === "state" ? "state" : "city"}">
                <i class="bi bi-calendar-event"></i>
            </div>
            <div class="holiday-content">
                <h3>${c.name}</h3>
                    <p>${startDate} até ${endDate}</p>
                    <div class="holiday-meta">
                        <span class="badge ${c.type === "national" ? "national" : c.type === "state" ? "state" : "city"}">
                        ${c.type === "national" ? "Nacional" : c.type === "state" ? "Estadual" : "Municipal"}
                        </span>
                    </div>
            </div>
        </div>`

        }

    }
    ).join("")

    document.querySelector("#holiday-count")!.textContent = String(holidayCount) + " feriados encontrados."



    const chips = document.querySelectorAll(".filter-chip") as NodeListOf<HTMLDivElement>
    chips.forEach(chip => {
        const itens = document.querySelectorAll(".holiday-item") as NodeListOf<HTMLDivElement>
        chip.addEventListener("click", () => {
            const formerActiveChip = document.querySelector(".filter-chip.active") as HTMLDivElement
            formerActiveChip.className = "filter-chip"
            chip.className = "filter-chip active"
            if (chip.innerText === "Todos") {
                itens.forEach(item => {
                    item.hidden = false
                })
            } else {
                itens.forEach(item => {
                    if (chip.innerText === "Nacional") {
                        item.dataset.type === "national" ? item.hidden = false : item.hidden = true
                    }
                    else if (chip.innerText === "Estadual") {
                        item.dataset.type === "state" ? item.hidden = false : item.hidden = true
                    }
                    else {
                        item.dataset.type === "city" ? item.hidden = false : item.hidden = true
                    }
                })
            }
        })

    });
    document.querySelector("#newHoliday")?.addEventListener("click", () => {
        const inputs = document.querySelectorAll("input")
        const today = new Date()
        inputs[1].value = ""
        inputs[2].value = formatISO(today, { representation: "date" })
        inputs[3].value = formatISO(today, { representation: "date" })
        document.querySelector("select")!.options.selectedIndex = 0
        const cardForm = document.querySelector(".card") as HTMLDivElement
        cardForm.dataset.id = "0"
    })

    const itens = document.querySelectorAll(".holiday-item") as NodeListOf<HTMLDivElement>
    itens.forEach(c => {
        c.onclick = () => {
            const inputs = document.querySelectorAll("input")
            const data = c.children
            const dates = data.item(1)?.children.item(1)?.textContent.split("até").map(c => {
                const rawDate = c.split("/")
                return String(rawDate[2].trim() + "-" + rawDate[1].trim() + "-" + rawDate[0].trim()) ?? ""
            })
            // name
            inputs[1].value = data.item(1)?.children.item(0)?.textContent ?? ""
            if (dates) {
                //startDate
                inputs[2].value = dates[0]
                //endDate
                inputs[3].value = dates[1]
            }
            const type = document.querySelector("select")
            const holidayType = data.item(0)?.className
            type!.selectedIndex = holidayType?.includes("national") ? 0 : holidayType?.includes("state") ? 1 : 2
            const cardForm = document.querySelector(".card") as HTMLDivElement
            cardForm.dataset.id = c.dataset.id
        }
    })

    document.querySelector("#saveBtn")!.addEventListener("click", async () => {
        const cardForm = document.querySelector(".card") as HTMLDivElement
        const holidayId = Number(cardForm.dataset.id)
        const inputs = document.querySelectorAll("input")
        const selectedIndex = document.querySelector("select")?.selectedIndex
        if (holidayId) {
            const holiday: Holidays = {
                id: holidayId,
                startDate: inputs[2].value,
                endDate: inputs[3].value,
                name: inputs[1].value,
                type: selectedIndex === 0 ? "national" : selectedIndex === 1 ? "state" : "city"
            }
            await sendMessage("UPDATE_HOLIDAYS", { holidays: holiday })
            const i = holidaysData.findIndex(c => c.id === holidayId)
            holidaysData[i] = holiday
            renderHolidays()
            showToast("Feriado alterado com sucesso.")


        } else {
            const holiday: Holidays = {
                startDate: inputs[2].value,
                endDate: inputs[3].value,
                name: inputs[1].value,
                type: selectedIndex === 0 ? "national" : selectedIndex === 1 ? "state" : "city"
            }

            const result = await sendMessage("SAVE_HOLIDAYS", { holidays: holiday })
            if (result.data) {
                cardForm.dataset.id = String(result.data)
                holiday.id = result.data
                holidaysData.push(holiday)
                renderHolidays()
                showToast("Feriado criado com sucesso.")

            }

        }
    })

    document.querySelector("#deleteBtn")!.addEventListener("click", async () => {
        const cardForm = document.querySelector(".card") as HTMLDivElement
        const holidayId = Number(cardForm.dataset.id)
        if (!holidayId) return
        const result = await sendMessage("DELETE_HOLIDAYS", { id: holidayId })
        if (result.data) {
            const i = holidaysData.findIndex(c => c.id === holidayId)
            holidaysData.splice(i, 1)
            showToast("Feriado deletado com sucesso.")
            const inputs = document.querySelectorAll("input")
            inputs[1].value = ""
            inputs[2].value = ""
            //endDate
            inputs[3].value = ""
            document.querySelector("select")!.selectedIndex = 0
            cardForm.dataset.id = "0"

        }

    })



    document.querySelector("#holiday-search")?.addEventListener("keyup", (e) => {
        const input = e.target as HTMLInputElement
        const itens = document.querySelectorAll(".holiday-item") as NodeListOf<HTMLDivElement>
        itens.forEach(c => {
            if (c.dataset.name?.toUpperCase().includes(input.value.toUpperCase()))
                c.hidden = false
            else c.hidden = true
        })

    })
}





