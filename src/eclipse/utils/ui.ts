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
