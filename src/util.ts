import type { Processo } from "./solar/types/lawsuit";

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


export async function downloadPDF(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName + '.pdf';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


export async function getLawsuitData(lawsuit: string){
    try {
        const response = await fetch("https://solar.defensoria.mg.def.br/procapi/processo/" + lawsuit + "/consultar/")
    if(response.ok)
        return await response.json() as Processo

    } catch (error) {
        console.error(error)
    }
}


export async function concurrentDownload(uri: string[], limit: number, worker: Function) {
  const results = new Array(uri.length)
  let nextIndex = 0

  async function runner() {
    while (nextIndex < uri.length) {
      const current = nextIndex++
      results[current] = await worker(uri[current], current)
    }
  }

  const workers = Array.from({ length: limit }, () => runner())
  await Promise.all(workers)
  return results
}
