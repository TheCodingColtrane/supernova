import type { Lawsuits } from "../types/lawsuits"
import { getUserCredentials } from "../utils"

export function sendClientSideEmail() {

    if (document.location.href.includes("https://outlook.cloud.microsoft/mail/deeplink/compose")) {
        const composeButton = document.querySelector("[data-automation-type='RibbonSplitButton'] > button") as HTMLButtonElement
        composeButton.click()
        const emailTo = document.querySelector("[inputmode='email']")
        if (emailTo) emailTo.innerHTML = "oi@oi.com"
        const emailSubject = document.querySelector("[aria-label='Assunto']")
        if (emailSubject) emailSubject.innerHTML = "oi@oi.com"
        const emailBody = document.querySelector("[data-ms-editor='true']")
        if (emailBody) emailBody.innerHTML = "teste"
        const importantButton = document.querySelectorAll("[data-automation-type='RibbonToggleButton']")[14] as HTMLButtonElement
        if (importantButton) importantButton.click()
        const sendButton = document.querySelector("[aria-label='Enviar']") as HTMLButtonElement
        sendButton.click() 
    }

}


export async function sendEmail(lawsuits: Lawsuits[]) {
  const user = await getUserCredentials()
  if (user) {
    const hour = new Date().getHours()
    const dayPeriod = hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite"
    let emailBody = `${dayPeriod} ${user?.name},\n\nVeja seu(s) processo(s) cujo(s) prazo(s) vence(m) hoje:\n\n`;
    for (const lawsuit of lawsuits) {
      emailBody += `${lawsuit.circuit} - ${lawsuit.assisted} - ${lawsuit.assisted}\n`;
    }
    const encodedBody = encodeURIComponent(emailBody);
    const encodedSubject = encodeURIComponent("Seus prazos de hoje");
    const emailPage = `https://outlook.cloud.microsoft/mail/deeplink/compose?to=${user.email}&subject=${encodedSubject}}&body=${encodedBody}&send=true`
    const tab = await chrome.tabs.create({ url: emailPage });
    chrome.runtime.sendMessage({ type: "TRACK_OUTLOOK_TAB", tabId: tab.id });
  }
}