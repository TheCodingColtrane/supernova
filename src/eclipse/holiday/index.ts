import { formatISO } from "date-fns";
import type { Holidays } from "../types/holidays";
import { sendMessage } from "../../util";
let holidaysData = Array<Holidays>();


(async () => {
    const holidays = await sendMessage("GET_HOLIDAYS", {}) as any
    holidaysData = holidays.data as Holidays[]
    renderHolidays()
})()


function renderHolidays() {
    const holidayList = document.querySelector(".holiday-list")
    holidayList!.innerHTML = holidaysData.map((c, i) => {
        const rawStartDate = String(c.startDate).split("-")
        const startDate = rawStartDate[2] + "/" + rawStartDate[1] + "/" + rawStartDate[0]
        const rawEndDate = String(c.endDate).split("-")
        const endDate = rawEndDate[2] + "/" + rawEndDate[1] + "/" + rawEndDate[0]
        return `<div class=${!i ? "holiday-item" : "holiday-item active"} data-id=${c.id}>
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
    ).join("")

    document.querySelector("#newHoliday")?.addEventListener("click", () => {
        const inputs = document.querySelectorAll("input")
        const today = new Date()
        inputs[1].value = ""
        inputs[2].value = formatISO(today, {representation: "date"})
        inputs[3].value = formatISO(today, {representation: "date"})
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

        } else {
            const holiday: Holidays = {
                startDate: inputs[2].value,
                endDate: inputs[3].value,
                name: inputs[1].value,
                type: selectedIndex === 0 ? "national" : selectedIndex === 1 ? "state" : "city"
            }

            const result = await sendMessage("SAVE_HOLIDAYS", { holidays: holiday })
            if(result.data){
                cardForm.dataset.id = String(result.data)
                holiday.id = result.data
                holidaysData.push(holiday)
                renderHolidays()
            }

        }
    })
}



