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