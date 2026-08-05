let baseTimeout: number;

export function showToast(message: string, duration = 3000): void {
  let toast = document.querySelector(".toast");

  if (!toast) {
    toast = document.createElement("div")
    toast.classList = "toast"
    const toastStyle = document.createElement("style")
    toastStyle.innerHTML = `
        .toast {
            position: fixed;
            left: 15%;
            bottom: 24px;
            transform: translateX(-50%) translateY(16px);
            background: rgba(28, 28, 28, .95);
            backdrop-filter: blur(8px);
            color: white;
            padding: 10px 18px;
            border-radius: 15px;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            visibility: hidden;
            transition: opacity .25s ease, transform .25s ease;
            z-index: 9999;
        }
        .toast.show {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }
            
        .toast.hide { 
            opacity: 0;
            transform:
            translateX(-50%) translateY(16px) scale(.95);
        }
        `
    document.head.appendChild(toastStyle)
    document.body.appendChild(toast)
  }


  clearTimeout(baseTimeout);

  toast.textContent = message;
  toast.classList.add("show");

  baseTimeout = window.setTimeout(() => {
    toast.classList = "hide"
    toast.classList.remove("show");
  }, duration);
}

export function renderLoadingSpinner() {
  const loadingSpinner = document.querySelector("#loadingOverlay") as HTMLDivElement
  if (!loadingSpinner) {
    const spinner = document.createElement("div")
    spinner.className = "loading-overlay hidden"
    spinner.id = "loadingOverlay"
    spinner.innerHTML = `
  <div class="spinner-container">
    <div class="spinner"></div>
    <span>Carregando...</span>
  </div>`
    const spinnerStyle = document.createElement("style")
    spinnerStyle.innerHTML = `
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255,255,255,.75);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;

  opacity: 1;
  visibility: visible;
  transition: .25s;
}

.loading-overlay.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;

  background: white;
  padding: 28px 36px;
  border-radius: 18px;

  box-shadow:
    0 15px 40px rgba(0,0,0,.12);

  min-width: 220px;
}

.spinner-container span {
  font-weight: 600;
  color: var(--text-main);
}

.spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;

  border: 5px solid #e2e8f0;
  border-top-color: var(--primary);

  animation: spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}`

    document.head.appendChild(spinnerStyle)
    document.body.appendChild(spinner)
    return spinner
  }
}


export function showLoadingSpinner() {
  let loading = document.querySelector("#loadingOverlay");
  if (!loading) {
    loading = renderLoadingSpinner()!
    loading!.classList.remove("hidden");
    return
  }
  loading.classList.remove("hidden");
}

export function hideLoadingSpinner() {
  const loading = document.querySelector("#loadingOverlay");
  loading!.classList.add("hidden");
}



export function createDownloadToast() {
  if (document.getElementById("download-toast")) return;

  const pageStyle = document.createElement("style")
  pageStyle.textContent = `#download-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 340px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
  padding: 16px;
  z-index: 999999;
  font-family: Inter, sans-serif;
  animation: slideIn 0.25s ease-out;
}

#download-toast-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

#download-toast-icon {
  font-size: 18px;
}

#download-toast-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

#download-toast-status {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 10px;
}

#download-toast-progress {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

#download-toast-progress-bar {
  height: 100%;
  width: 0%;
  background: #2563eb;
  border-radius: inherit;
  transition: width 0.2s ease;
}

#download-toast-percent {
  text-align: right;
  margin-top: 6px;
  font-size: 12px;
  color: #4b5563;
}

#download-toast.success #download-toast-progress-bar {
  background: #16a34a;
}

#download-toast.error #download-toast-progress-bar {
  background: #dc2626;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}`

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div id="download-toast">
      <div id="download-toast-header">
        <span id="download-toast-icon">
        <i class='fas fa-download'></i>
        </span>
        <span id="download-toast-title">Download do documento</span>
      </div>

      <div id="download-toast-status">
        Preparando download...
      </div>

      <div id="download-toast-progress">
        <div id="download-toast-progress-bar"></div>
      </div>

      <div id="download-toast-percent">0%</div>
    </div>
  `
  );
  document.body.appendChild(pageStyle)
}


export function updateDownloadProgress(percent: number) {
  const bar = document.getElementById("download-toast-progress-bar");
  const label = document.getElementById("download-toast-percent");
  const status = document.getElementById("download-toast-status");

  bar!.style.width = `${percent}%`;
  label!.textContent = `${percent}%`;
  status!.textContent = "Baixando documento...";
}


export function finishDownloadToast() {
  const toast = document.getElementById("download-toast");
  if (!toast) return

  toast.classList.add("success");

  const icon = document.getElementById("download-toast-icon")
  if (icon) icon.innerHTML = "<i class='fas fa-check'><i>";
  const status = document.getElementById("download-toast-status")
  if (status) status.innerHTML = "Documento baixado com sucesso";

  const result = document.getElementById("download-toast-percent")
  if (result) result.textContent = "100%";

  setTimeout(() => {
    toast.remove();
  }, 3000);
}


export function failDownloadToast() {
  const toast = document.getElementById("download-toast");
  if (!toast) return
  toast.classList.add("error");

  const icon = document.getElementById("download-toast-icon")
  if (icon) icon.innerHTML = "<i class='fas fa-xmark'><i>";
  const status = document.getElementById("download-toast-status")
  if (status) status.innerHTML = "Erro ao baixar o processo";

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

export function generateModalStructure() {
  if (document.querySelector(".modal-overlay")) return;
  const pageStyle = document.createElement("style")
  pageStyle.textContent = `
   .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      /* Overlay levemente azulado/escuro */
      backdrop-filter: blur(4px);
      /* Efeito de vidro moderno */
      display: none;
      /* Escondido por padrão */
      align-items: center;
      justify-content: center;
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    .modal-overlay.active {
      display: flex;
      opacity: 1;
    }

 .modal-content {
      background: var(--white);
      width: 90%;
      max-width: 550px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      transform: translateY(20px);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    .modal-overlay.active .modal-content {
      transform: translateY(0);
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .modal-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
      padding: 5px;
      transition: color 0.2s;
    }

    .modal-close:hover {
      color: var(--danger);
    }

    .modal-body {
      padding: 1.5rem;
      max-height: 70vh;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      /* display: flex; */
      justify-content: flex-end;
      gap: 12px;
      background: #f8fafc;
    }

    /* Botão Secundário para o Modal */
    .btn-secondary {
      background: white;
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }`

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
  <div id="customModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">Título do Modal</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body" id="modalBody">
        <!-- Conteúdo dinâmico entra aqui -->
      </div>
      <div class="modal-footer" id="modalFooter">
        <!-- Botões dinâmicos entram aqui -->
      </div>
    </div>
  </div>
  `
  );
  document.body.appendChild(pageStyle)

}