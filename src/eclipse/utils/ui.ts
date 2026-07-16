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