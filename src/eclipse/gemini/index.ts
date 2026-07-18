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

export async function getGeminiLawsuitOutput(blob: Blob, fileName: string, prompt: string) {
  try {
    const tab = await chrome.tabs.create({
      url: "https://gemini.google.com/",
      active: true,
    });

    if (!tab.id) {
      throw new Error("Aba do Gemini não encontrada.");
    }

    await waitPageLoad(tab.id);
    const base64 = await blobToBase64(blob);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [base64, fileName, prompt],

      func: async (base64: string, fileName: string, prompt: string) => {
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
          'div[contenteditable="true"][role="textbox"]'
        ) as HTMLElement | null;

        if (!textInput) {
          console.error("Caixa de texto do Gemini não encontrada.");
          return;
        }

        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        const arquivo = new File(
          [byteArray],
          fileName,
          { type: "application/pdf" }
        );

        const dataTransfer = new DataTransfer();

        dataTransfer.items.add(arquivo);

        const pasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });

        textInput.focus();
        textInput.dispatchEvent(pasteEvent);

        setTimeout(() => {
          textInput.innerText = prompt;

          textInput.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              inputType: "insertText",
              data: prompt,
            })
          );

          console.log("Arquivo e texto inseridos com sucesso.");
        }, 500);
      },
    });
  } catch (error) {
    console.log(error)
  }

}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Não foi possível converter o Blob."));
        return;
      }

      // Remove o prefixo:
      // data:application/pdf;base64,
      const base64 = result.split(",")[1];

      resolve(base64);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}