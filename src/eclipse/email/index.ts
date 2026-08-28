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


export async function sendWarningEmail(lawsuits: Lawsuits[]) {
  const user = getUserCredentials()
  if (user) {
    const hour = new Date().getHours()
    const dayPeriod = hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite"
    let emailBody = `${dayPeriod} ${user?.nome},\n\Veja seu(s) processo(s) cujo(s) prazo(s) vence(m) hoje:\n\n`;
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



function waitPageLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (updatedTabId: number, changeInfo: any) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}



export async function sendEmail(subject: string, to: string, cc: string, body: string, isImportant: boolean) {
  const user = getUserCredentials()
  if (user) {
    const encodedBody = encodeURIComponent(body);
    const encodedSubject = encodeURIComponent(subject);
    const emailPage = `https://outlook.cloud.microsoft/mail/deeplink/compose?to=${to}&cc=${cc}&subject=${encodedSubject}}&body=${encodedBody}&send=true`
    try {
      const tab = await chrome.tabs.create({ url: emailPage });
      // chrome.runtime.sendMessage({ type: "TRACK_OUTLOOK_TAB", tabId: tab.id });
      if (!tab.id) {
        throw new Error("Aba do e-mail não encontrada.");
      }
      await waitPageLoad(tab.id);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [isImportant, cc],

        func: async (isImportant: boolean, copy: string) => {
          const waitForElement = (selector: string, timeout = 10000): Promise<HTMLElement> => {
            return new Promise((resolve, reject) => {
              const startTime = Date.now();

              const check = () => {
                const el = document.querySelector(selector) as HTMLElement | null;
                if (el) return resolve(el);

                if (Date.now() - startTime > timeout) {
                  return reject(new Error(`Elemento ${selector} não apareceu a tempo.`));
                }
                setTimeout(check, 500);
              };
              check();
            });
          };
          const textInput = await waitForElement(
            "[aria-label='Corpo da mensagem']"
          ) as HTMLElement | null;

          if (!textInput) {
            console.error("Caixa de texto do corpo do e-mail não encontrada.");
            return;
          }
          document.querySelector("[aria-label='Cc']")!.innerHTML = copy
          const buttonDiv = document.querySelector("[data-testid='ComposeSendButton']") as HTMLDivElement
          if (isImportant) {
            const importantButton = document.querySelectorAll("[data-automation-type='RibbonToggleButton']")[14] as HTMLButtonElement
            importantButton.click()
          }

          const sendEmailButton = buttonDiv.children.item(0) as HTMLButtonElement
          sendEmailButton.click()
          const isSendEmail = new URLSearchParams(document.location.search)
          if (isSendEmail.get("send") === "true") {
            const sentEmailIntervalId = setInterval(() => {
              if (document.querySelector("[data-automationid='splitbuttonprimary']")) {
                clearInterval(sentEmailIntervalId)
                window.close()
              }
            }, 1000)
          }

        }

      });
    } catch (error) {
      console.log(error)
    }

  }
}

// function createPlannerTask(title: string, dueDate: string, assignedTo: string, description: string) {
//   const createTaskButton = document.querySelector("[data-testid='addTaskButton']") as HTMLButtonElement
//   createTaskButton.click()
//   const taskTitle = document.querySelector("[aria-label='Nome da tarefa']") as HTMLInputElement
//   taskTitle.value = title
//   const datePickerDiv = document.querySelector("[data-testid='dueDatePicker']") as HTMLDivElement
//   const datePickerButton = datePickerDiv.children.item(1) as HTMLButtonElement
//   datePickerButton.click()
//   const datePicker = document.querySelector(`[aria-label='${dueDate}']`) as HTMLDivElement
//   datePicker.click()
//   const assignedToButton = document.querySelector("[aria-label='Atribuir']") as HTMLButtonElement
//   assignedToButton.click()
//   const workersList = document.querySelector("[aria-label='Sugestões']") as HTMLButtonElement
//   for (const worker of workersList.children) {
//     const currentWorker = worker.children.item(0)!.children.item(0)!.children.item(0) as HTMLButtonElement
//     if (currentWorker.children.item(1)?.innerHTML.toUpperCase() === assignedTo)
//       currentWorker.click()
//   }
//   const taskCard = document.querySelector(`[aria-label='${title}']`) as HTMLButtonElement
//   taskCard.click()
//   const displayCardDescContent = document.querySelector(`[aria-label='Mostrar Anotações na visualização de quadro']`) as HTMLInputElement
//   displayCardDescContent.checked = true
//   const cardInputElements = document.querySelector("[data-testid=task-editor-root")?.children.item(1)!.children.item(1)?.children.item(0)
//   const cardDescContent = cardInputElements?.children.item(2)?.children.item(1) as HTMLInputElement
//   const cardInput = cardDescContent.children.item(1)?.children.item(0) as HTMLInputElement
// [
//     'pointerdown',
//     'mousedown',
//     'focus',
//     'focusin',
//     'mouseup',
//     'click'
// ].forEach(type => {
//     cardInput.addEventListener(type, e => {
//         console.log(
//             type,
//             'trusted=', e.isTrusted,
//             'defaultPrevented=', e.defaultPrevented
//         );
//     }, true);
// });
//   cardInput.textContent = "etrtr"
//   // cardInput.click()
//   // cardInput.dispatchEvent(
//   //   new InputEvent("input", {
//   //     bubbles: true,
//   //     inputType: "insertText",
//   //     data: "teste",
//   //   }))








//   //Prazo para o estagiário.
//   // Prazo do processo.
//   // Colocar prazo do processo entre parenteses.
// } 