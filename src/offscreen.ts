import { jsPDF } from "jspdf";

// Escuta as mensagens vindas do seu script principal
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.action !== "offscreen") {
    return;
  }

  convertHtmlToPdf(message.payload)
    .then((content) => {
      sendResponse({
        success: true,
        data: {content: Array.from(new Uint8Array(content.buffer)), pages: content.pages},
      });
    })
    .catch((error) => {
      console.error(error);

      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});
export async function convertHtmlToPdf(htmlString: string): Promise<{buffer: ArrayBuffer, pages: number}> {
  return new Promise((resolve, reject) => {
    try {
      const container = document.createElement("div");
      container.innerHTML = htmlString;
      container.style.margin = "20px"
      document.body.appendChild(container);
      const doc = new jsPDF({ orientation: 'p', unit: 'px', format: [800, 1080], hotfixes: ["px_scaling"] });
      doc.html(container, {
        x: 0,
        y: 0,
        width: 800,
        windowWidth: 800,
        callback: function (newDoc) {
          try {
          const data = {buffer: newDoc.output('arraybuffer'), pages: newDoc.getNumberOfPages()}
          document.body.removeChild(container)

          resolve(data);
          } catch (err) {
            console.log(err)
            document.body.removeChild(container)
            reject(err);
          }
        }
      });
    } catch (err) {
      console.log(err)
      reject(err);
    }
  });
}