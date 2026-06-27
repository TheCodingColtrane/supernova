export function sendClientSideEmail() {
    if (document.location.href.includes("https://outlook.cloud.microsoft/mail/")) {
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
