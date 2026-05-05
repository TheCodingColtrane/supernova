"use strict";

// node_modules/date-fns/_lib/getRoundingMethod.js
function getRoundingMethod(method) {
  return (number) => {
    const round = method ? Math[method] : Math.trunc;
    const result = round(number);
    return result === 0 ? 0 : result;
  };
}

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInDay = 864e5;
var millisecondsInHour = 36e5;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = /* @__PURE__ */ Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
  const normalize = constructFrom.bind(
    null,
    context || dates.find((date) => typeof date === "object")
  );
  return dates.map(normalize);
}

// node_modules/date-fns/differenceInHours.js
function differenceInHours(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const diff = (+laterDate_ - +earlierDate_) / millisecondsInHour;
  return getRoundingMethod(options?.roundingMethod)(diff);
}

// node_modules/date-fns/_lib/addLeadingZeros.js
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/formatISO.js
function formatISO(date, options) {
  const date_ = toDate(date, options?.in);
  if (isNaN(+date_)) {
    throw new RangeError("Invalid time value");
  }
  const format = options?.format ?? "extended";
  const representation = options?.representation ?? "complete";
  let result = "";
  let tzOffset = "";
  const dateDelimiter = format === "extended" ? "-" : "";
  const timeDelimiter = format === "extended" ? ":" : "";
  if (representation !== "time") {
    const day = addLeadingZeros(date_.getDate(), 2);
    const month = addLeadingZeros(date_.getMonth() + 1, 2);
    const year = addLeadingZeros(date_.getFullYear(), 4);
    result = `${year}${dateDelimiter}${month}${dateDelimiter}${day}`;
  }
  if (representation !== "date") {
    const offset = date_.getTimezoneOffset();
    if (offset !== 0) {
      const absoluteOffset = Math.abs(offset);
      const hourOffset = addLeadingZeros(Math.trunc(absoluteOffset / 60), 2);
      const minuteOffset = addLeadingZeros(absoluteOffset % 60, 2);
      const sign = offset < 0 ? "+" : "-";
      tzOffset = `${sign}${hourOffset}:${minuteOffset}`;
    } else {
      tzOffset = "Z";
    }
    const hour = addLeadingZeros(date_.getHours(), 2);
    const minute = addLeadingZeros(date_.getMinutes(), 2);
    const second = addLeadingZeros(date_.getSeconds(), 2);
    const separator = result === "" ? "" : "T";
    const time = [hour, minute, second].join(timeDelimiter);
    result = `${result}${separator}${time}${tzOffset}`;
  }
  return result;
}

// src/core/utils.ts
async function sendMessage(message, data) {
  try {
    console.log("oi");
    const response = await chrome.runtime.sendMessage({ type: message, payload: data });
    if (response?.success === false) {
      console.error("Erro no SW:", response.error);
      throw new Error(response.error);
    }
    return response;
  } catch (error) {
    console.error("Falha ao enviar mensagem para SW:", error);
    if (chrome.runtime.lastError) {
      console.error("Detalhe do erro:", chrome.runtime.lastError.message);
    }
    throw error;
  }
}
async function getDefendersAPI() {
  try {
    const response = await fetch("https://solar.defensoria.mg.def.br/api/v1/defensores.json?ativo=true&incluir_atuacoes=true&limit=1000");
    return await response.json();
  } catch (error) {
    console.log(error);
  }
}
async function getDefenders() {
  const THIRTY_DAYS = 1e3 * 60 * 60 * 24 * 30;
  let data = await chrome.storage.local.get("nextUpdate");
  if (!Object.hasOwn(data, "nextUpdate") || Date.now() >= data.nextUpdate) {
    const currentDefenders = await getDefendersAPI();
    if (currentDefenders) {
      await chrome.storage.local.set({
        defenders: currentDefenders.results,
        cacheVersion: "1.0",
        nextUpdate: Date.now() + THIRTY_DAYS
      });
      return currentDefenders.results;
    }
    return;
  }
  data = await chrome.storage.local.get("defenders");
  return data.defenders;
}
function getUserCredentials() {
  const creds = JSON.parse(localStorage.getItem("user") ?? "");
  if (creds) {
    return creds;
  }
}

// node_modules/date-fns/isSaturday.js
function isSaturday(date, options) {
  return toDate(date, options?.in).getDay() === 6;
}

// node_modules/date-fns/isSunday.js
function isSunday(date, options) {
  return toDate(date, options?.in).getDay() === 0;
}

// node_modules/date-fns/isWeekend.js
function isWeekend(date, options) {
  const day = toDate(date, options?.in).getDay();
  return day === 0 || day === 6;
}

// node_modules/date-fns/addBusinessDays.js
function addBusinessDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  const startedOnWeekend = isWeekend(_date, options);
  if (isNaN(amount)) return constructFrom(options?.in, NaN);
  const hours = _date.getHours();
  const sign = amount < 0 ? -1 : 1;
  const fullWeeks = Math.trunc(amount / 5);
  _date.setDate(_date.getDate() + fullWeeks * 7);
  let restDays = Math.abs(amount % 5);
  while (restDays > 0) {
    _date.setDate(_date.getDate() + sign);
    if (!isWeekend(_date, options)) restDays -= 1;
  }
  if (startedOnWeekend && isWeekend(_date, options) && amount !== 0) {
    if (isSaturday(_date, options))
      _date.setDate(_date.getDate() + (sign < 0 ? 2 : -1));
    if (isSunday(_date, options))
      _date.setDate(_date.getDate() + (sign < 0 ? 1 : -2));
  }
  _date.setHours(hours);
  return _date;
}

// node_modules/date-fns/addDays.js
function addDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount)) return constructFrom(options?.in || date, NaN);
  if (!amount) return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}

// node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
function getTimezoneOffsetInMilliseconds(date) {
  const _date = toDate(date);
  const utcDate = new Date(
    Date.UTC(
      _date.getFullYear(),
      _date.getMonth(),
      _date.getDate(),
      _date.getHours(),
      _date.getMinutes(),
      _date.getSeconds(),
      _date.getMilliseconds()
    )
  );
  utcDate.setUTCFullYear(_date.getFullYear());
  return +date - +utcDate;
}

// node_modules/date-fns/startOfDay.js
function startOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/differenceInCalendarDays.js
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}

// node_modules/date-fns/isSameDay.js
function isSameDay(laterDate, earlierDate, options) {
  const [dateLeft_, dateRight_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  return +startOfDay(dateLeft_) === +startOfDay(dateRight_);
}

// node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}

// node_modules/date-fns/differenceInBusinessDays.js
function differenceInBusinessDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  if (!isValid(laterDate_) || !isValid(earlierDate_)) return NaN;
  const diff = differenceInCalendarDays(laterDate_, earlierDate_);
  const sign = diff < 0 ? -1 : 1;
  const weeks = Math.trunc(diff / 7);
  let result = weeks * 5;
  let movingDate = addDays(earlierDate_, weeks * 7);
  while (!isSameDay(laterDate_, movingDate)) {
    result += isWeekend(movingDate, options) ? 0 : sign;
    movingDate = addDays(movingDate, sign);
  }
  return result === 0 ? 0 : result;
}

// node_modules/date-fns/differenceInDays.js
function differenceInDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const sign = compareLocalAsc(laterDate_, earlierDate_);
  const difference = Math.abs(
    differenceInCalendarDays(laterDate_, earlierDate_)
  );
  laterDate_.setDate(laterDate_.getDate() - sign * difference);
  const isLastDayNotFull = Number(
    compareLocalAsc(laterDate_, earlierDate_) === -sign
  );
  const result = sign * (difference - isLastDayNotFull);
  return result === 0 ? 0 : result;
}
function compareLocalAsc(laterDate, earlierDate) {
  const diff = laterDate.getFullYear() - earlierDate.getFullYear() || laterDate.getMonth() - earlierDate.getMonth() || laterDate.getDate() - earlierDate.getDate() || laterDate.getHours() - earlierDate.getHours() || laterDate.getMinutes() - earlierDate.getMinutes() || laterDate.getSeconds() - earlierDate.getSeconds() || laterDate.getMilliseconds() - earlierDate.getMilliseconds();
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return diff;
}

// src/core/utils/date.ts
function localDateToIsoDate(date, time) {
  date = date.replaceAll("/", "-");
  if (time && date.includes(":")) {
    const aux2 = date.substring(0, 10).split("-");
    return aux2[2] + "-" + aux2[1] + "-" + aux2[0] + "T" + date.substring(10);
  }
  const aux = date.split("-");
  return aux[2] + "-" + aux[1] + "-" + aux[0];
}
function isBusinessDay(date) {
  if (date.getDay() === 6 || date.getDay() === 0)
    return false;
  return true;
}
function getNextBusinessDay(date) {
  const day = date.getDay();
  if (!isBusinessDay(date))
    return addDays(date, day === 6 ? 2 : 1);
  else
    return addDays(date, 1);
}
function getBusinessDays(startDate, endDate, holidays, isElapsedDays = false) {
  if (!isBusinessDay(startDate))
    startDate = new Date(getNextBusinessDay(startDate));
  if (!isBusinessDay(endDate))
    endDate = new Date(getNextBusinessDay(endDate));
  if (startDate.getTime() > endDate.getTime())
    return { days: 0, deadline: endDate, isDueDate: true };
  let days = !isElapsedDays ? differenceInBusinessDays(endDate, startDate) : differenceInDays(endDate, startDate);
  let datesToIgnore = Array();
  if (holidays?.length) {
    const pendingHolidays = holidays.filter(
      (h) => new Date(h.startDate).getTime() >= new Date(startDate).getTime() && new Date(h.endDate).getTime() <= new Date(endDate).getTime()
    );
    if (pendingHolidays?.length) {
      const isEndDateHoliday = pendingHolidays.find((c) => c.startDate === formatISO(endDate, { representation: "date" }));
      if (isEndDateHoliday && !isElapsedDays) endDate = new Date(getNextBusinessDay(endDate));
      for (const holiday of pendingHolidays) {
        let days2 = differenceInDays(new Date(holiday.endDate), new Date(holiday.startDate));
        if (!days2) {
          datesToIgnore.push(holiday.startDate);
          continue;
        }
        for (let i = 1; i < days2; i++) {
          let currentDate = addDays(new Date(holiday.startDate), i);
          datesToIgnore.push(formatISO(currentDate, { representation: "date" }));
        }
      }
    }
    days += !isElapsedDays ? differenceInBusinessDays(addBusinessDays(startDate, datesToIgnore.length), startDate) : differenceInDays(addDays(startDate, datesToIgnore.length), startDate);
    endDate = !isElapsedDays ? addBusinessDays(startDate, days) : addDays(startDate, days);
  }
  return { days: days < 0 ? 0 : days, deadline: endDate, isDueDate: false };
}

// src/core/controller/dashboard.ts
function showAlert(message, type = "success", duration = 4e3) {
  const container = document.querySelector("#toastContainer");
  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; cursor:pointer; font-size:1.2rem; margin-left:10px; color:var(--text-muted)">&times;</button>
  `;
  const toastButton = toast.querySelector("button");
  toastButton.onclick = () => removeToast(toast);
  container?.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}
function removeToast(toast) {
  toast.classList.add("hiding");
  toast.addEventListener("animationend", () => {
    toast.remove();
  });
}
function getDeadlineClass(days) {
  if (days <= 0) return "deadline-danger";
  if (days <= 3) return "deadline-warning";
  return "deadline-ok";
}
function getStatusClass(status) {
  if (status === "late") return "status-late";
  if (status === "closed") return "status-closed";
  return "status-open";
}
var activeFilters = { circuit: "", status: "", side: "", assignedTo: "" };
var lawsuitsData = Array();
var holidaysData = Array();
var defender = {};
var circuits = new Set("");
(async function() {
  try {
    const lawsuits = sendMessage("GET_PENDING_LAWSUITS", {});
    const holidays = sendMessage("GET_HOLIDAYS", {});
    const results = await Promise.all([lawsuits, holidays]);
    holidaysData = results[1].data;
    lawsuitsData = results[0].data;
    lawsuitsData.map((c) => {
      if (!circuits.has(c.circuit)) {
        circuits.add(c.circuit);
      }
    });
    const select = document.querySelector("#filterCircuit");
    circuits.forEach((c) => {
      const opt = document.createElement("option");
      opt.textContent = c;
      select.options.add(opt);
    });
    const creds = getUserCredentials();
    if (creds) {
      const defenders = await getDefenders();
      if (defenders) defender = defenders.find((d) => d.id === creds.id) ?? {};
    }
    sessionStorage.setItem("lawsuits", JSON.stringify(lawsuitsData));
  } catch (error) {
    console.log(error);
  }
})();
function closePanel() {
  document.querySelector("#sidePanel")?.classList.remove("open");
  document.querySelector("#overlay")?.classList.remove("active");
}
async function saveLawsuit(lawsuits) {
  await sendMessage("SAVE_LAWSUITS", { lawsuits });
}
async function updateLawsuit(lawsuits) {
  await sendMessage("UPDATE_LAWSUITS", { lawsuits });
}
async function deleteLawsuit(id) {
  await sendMessage("DELETE_LAWSUITS", { ids: id });
}
function openPanel(id) {
  const number = document.querySelector("#editNumber");
  const assisted = document.querySelector("#editAssisted");
  const circuit = document.querySelector("#editCircuit");
  const status = document.querySelector("#editStatus");
  const side = document.querySelector("#editSide");
  const awareness = document.querySelector("#editAwarenessDate");
  const startDeadline = document.querySelector("#editStartDeadline");
  const endDeadline = document.querySelector("#editEndDeadline");
  const deleteBtn = document.querySelector(".btn-delete");
  const saveBtn = document.querySelector(".btn-save");
  document.querySelector("#sidePanel")?.classList.add("open");
  document.querySelector("#overlay")?.classList.add("active");
  document.querySelector(".btn-close")?.addEventListener("click", () => {
    closePanel();
  });
  const data = [...lawsuitsData].find((c) => c.id === id);
  if (data) {
    deleteBtn.disabled = false;
    number.value = data.number;
    assisted.value = data.assisted;
    circuits.forEach((c) => {
      const opt = document.createElement("option");
      opt.textContent = c;
      circuit.options.add(opt);
      if (data.circuit === c) opt.selected = true;
    });
    if (data.status === "Aberto") status.selectedIndex = 0;
    else status.selectedIndex = 1;
    if (data.isDefendant) side.selectedIndex = 1;
    else side.selectedIndex = 0;
    awareness.value = !data.awarenessDate ? "" : new Date(data.awarenessDate).toLocaleDateString();
    startDeadline.value = !data.initialDeadline ? "" : new Date(data.initialDeadline).toLocaleDateString();
    endDeadline.value = !data.deadline ? "" : new Date(data.deadline).toLocaleDateString();
    saveBtn?.addEventListener("click", async () => {
      const form = document.querySelector("#editForm");
      const formData = Object.fromEntries(new FormData(form));
      let awarenessDate = formData["awarenessDate"];
      if (awarenessDate) awarenessDate = localDateToIsoDate(awarenessDate, false);
      let initialDeadline = formData["initialDeadline"];
      if (initialDeadline) initialDeadline = localDateToIsoDate(initialDeadline, false);
      let deadline = formData["deadline"];
      if (deadline) deadline = localDateToIsoDate(deadline, false);
      const lawsuit = {
        assisted: formData["assisted"],
        awarenessDate,
        circuit: formData["circuit"],
        deadline,
        defender: data.defender,
        givenDeadLine: data.givenDeadLine,
        initialDeadline,
        isDefendant: formData["isDefendant"]?.toString() === "0" ? true : false,
        number: formData["number"],
        source: data.source,
        status: formData["status"]?.toString() === "0" ? "Aguardando Abertura" : "Aberto",
        id
      };
      await updateLawsuit(lawsuit);
      showAlert("Processo atualizado com sucesso.", "success");
      const i = lawsuitsData.findIndex((c) => c.id === id);
      lawsuitsData[i] = { ...lawsuit };
      closePanel();
      renderTableWithOptions();
    });
    deleteBtn?.addEventListener("click", async () => {
      await deleteLawsuit(id);
      showAlert("Processo deletado com sucesso.", "success");
      const idx = lawsuitsData.findIndex((c) => c.id === id);
      lawsuitsData = lawsuitsData.splice(idx, 1);
      closePanel();
      renderTableWithOptions();
    });
  } else {
    circuits.forEach((c) => {
      const opt = document.createElement("option");
      opt.textContent = c;
      circuit.options.add(opt);
    });
    deleteBtn.disabled = true;
    saveBtn?.addEventListener("click", async () => {
      const form = document.querySelector("#editForm");
      const formData = Object.fromEntries(new FormData(form));
      let awarenessDate = formData["awarenessDate"];
      if (awarenessDate) awarenessDate = localDateToIsoDate(awarenessDate, false);
      let initialDeadline = formData["initialDeadline"];
      if (initialDeadline) initialDeadline = localDateToIsoDate(initialDeadline, false);
      let deadline = formData["deadline"];
      if (deadline) deadline = localDateToIsoDate(deadline, false);
      const lawsuit = {
        assisted: formData["assisted"],
        awarenessDate,
        circuit: formData["circuit"],
        deadline,
        defender,
        givenDeadLine: 15,
        initialDeadline,
        isDefendant: formData["isDefendant"]?.toString() === "0" ? true : false,
        number: formData["number"],
        source: "EPROC-1G-MG",
        status: formData["status"]?.toString() === "0" ? "Aguardando Abertura" : "Aberto"
      };
      await saveLawsuit(lawsuit);
      showAlert("Processo cadastrado com sucesso.", "success");
      lawsuitsData.push({ ...lawsuit });
      closePanel();
      renderTableWithOptions();
    });
  }
}
function changeSortOrder(propName, prop, sortOrder) {
  const props = { "number": "", "circuit": "", "assisted": "", "status": "", "isDefendant": "", "deadline": "" };
  if (sortOrder === "" || sortOrder === "desc") sortOrder = "asc";
  else sortOrder = "desc";
  const ths = Array.from(document.querySelectorAll("thead th"));
  for (const th of ths) {
    const curTh = th;
    if (curTh.dataset.nm !== propName) {
      curTh.dataset.sort = "";
    } else curTh.dataset.sort = sortOrder;
  }
  const b64Text = btoa(propName + "," + sortOrder);
  const url = new URLSearchParams(window.location.search);
  url.set("key", b64Text);
  window.history.pushState(null, "", url.toString());
  const data = JSON.parse(sessionStorage.getItem("lawsuits"));
  const sortedLawsuits = sortTable(data, prop, sortOrder);
  renderTable(sortedLawsuits);
}
function sortTable(arr, property, order) {
  return [...arr].sort((a, b) => {
    const valA = a[property];
    const valB = b[property];
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });
}
async function renderTable(data, holidays, isElapsedDays = false) {
  const table = document.getElementById("processTable");
  table?.replaceChildren();
  table.innerHTML = "";
  const today = /* @__PURE__ */ new Date();
  data.forEach((p) => {
    let dates = { days: 0, deadline: /* @__PURE__ */ new Date(), isDueDate: false };
    if (p.initialDeadline && p.deadline) {
      const dateComponents = p.deadline.toString().split("-");
      dates = getBusinessDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2])), holidays, isElapsedDays);
    }
    const tr = document.createElement("tr");
    tr.dataset.id = p.id?.toString();
    const timeLeft = differenceInHours(today, new Date(today.getFullYear(), today.getMonth(), today.getDate())) + " horas e " + (60 - today.getMinutes()) + " minutos restantes";
    tr.innerHTML = `
        <td class="row-action">
         <span class="action-icon">Editar</span>
        </td>
        <td>${p.number}</td>
        <td>${p.circuit}</td>
        <td>${p.assisted}</td>
        <td><span class="badge ${getStatusClass(p.status)}">${p.status}</span></td>
        <td>${p.isDefendant ? "Passivo" : "Ativo"}</td>
        <td>${!p.deadline ? "N\xE3o definido" : new Date(dates.deadline).toLocaleDateString()}</td>
        <td class="${getDeadlineClass(dates.days)}">
          ${dates.isDueDate ? "Prazo Perdido" : dates.days > 0 ? dates.days + " dias" : timeLeft}
        </td>
        <td>${Array.isArray(p.defender) ? "Defensores da vara" : p.defender.nome}</td>
      `;
    tr.addEventListener("click", () => {
      if (p.id) openPanel(p.id);
    });
    table.appendChild(tr);
  });
}
function renderTableWithOptions() {
  const isElapsedDays = document.querySelector("#checkCalendarDays");
  const isHolidays = document.querySelector("#checkHolidays");
  renderTable(lawsuitsData, isHolidays.checked ? holidaysData : [], isElapsedDays.checked);
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { data } = await sendMessage("GET_PENDING_LAWSUITS", {});
    if (data) {
      sessionStorage.setItem("lawsuits", JSON.stringify(data));
      renderTable(data);
      const ths = Array.from(document.querySelectorAll("thead th"));
      for (const th of ths) {
        th.addEventListener("click", (e) => {
          const curTh = th;
          switch (curTh.dataset.nm) {
            case "number":
              changeSortOrder(curTh.dataset.nm, "number", curTh.dataset.sort);
              break;
            case "circuit":
              changeSortOrder(curTh.dataset.nm, "circuit", curTh.dataset.sort);
              break;
            case "assisted":
              changeSortOrder(curTh.dataset.nm, "assisted", curTh.dataset.sort);
              break;
            case "status":
              changeSortOrder(curTh.dataset.nm, "status", curTh.dataset.sort);
              break;
            case "side":
              changeSortOrder(curTh.dataset.nm, "isDefendant", curTh.dataset.sort);
              break;
            case "deadline":
              changeSortOrder(curTh.dataset.nm, "deadline", curTh.dataset.sort);
              break;
            case "daysLeft":
              changeSortOrder(curTh.dataset.nm, "daysLeft", curTh.dataset.sort);
              break;
          }
        });
        const searchField = document.querySelector("#search");
        searchField.addEventListener("keydown", (e) => {
          const input = searchField;
          searchLawsuits(input.value);
        });
        const lawsuits = data;
        const today = formatISO(/* @__PURE__ */ new Date(), { representation: "date" });
        document.querySelector("#todayCount").innerHTML = lawsuits.filter((c) => c.deadline === today).length.toString();
        document.querySelector("#weekCount").innerHTML = lawsuits.length.toString();
        document.querySelector("#activeCount").innerHTML = lawsuits.length.toString();
        document.querySelector("#checkHolidays")?.addEventListener("change", (e) => {
          if (holidaysData) {
            const isElapsedDays = document.querySelector("#checkCalendarDays");
            const input = e.target;
            renderTable(lawsuits, input.checked ? holidaysData : [], isElapsedDays.checked);
          }
        });
        document.querySelector("#checkCalendarDays")?.addEventListener("change", (e) => {
          if (holidaysData) {
            const isElapsedDaysInput = e.target;
            const checkHolidaysInput = document.querySelector("#checkHolidays");
            return renderTable(data, checkHolidaysInput.checked ? holidaysData : [], isElapsedDaysInput.checked);
          }
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
});
document.querySelector("#filterCircuit")?.addEventListener("change", (e) => {
  const select = e.target;
  const search = document.querySelector("#search");
  if (select.selectedOptions.item(0)?.textContent === "Todas") {
    activeFilters.circuit = "";
    searchLawsuits(search.value);
  } else {
    activeFilters.circuit = select.selectedOptions.item(0)?.textContent;
    searchLawsuits(search.value);
  }
});
document.querySelector("#filterStatus")?.addEventListener("change", (e) => {
  const select = e.target;
  const search = document.querySelector("#search");
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.status = "";
    searchLawsuits(search.value);
  } else {
    activeFilters.status = select.selectedOptions.item(0)?.textContent;
    searchLawsuits(search.value);
  }
});
document.querySelector("#filterSide")?.addEventListener("change", (e) => {
  const select = e.target;
  const search = document.querySelector("#search");
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.side = "";
    searchLawsuits(search.value);
  } else {
    activeFilters.side = select.selectedOptions.item(0)?.textContent;
    searchLawsuits(search.value);
  }
});
document.querySelector("#filterAssignedTo")?.addEventListener("change", (e) => {
  const select = e.target;
  const search = document.querySelector("#search");
  if (select.selectedOptions.item(0)?.textContent === "Todos") {
    activeFilters.assignedTo = "";
    searchLawsuits(search.value);
  } else {
    activeFilters.assignedTo = select.selectedOptions.item(0)?.textContent;
    searchLawsuits(search.value);
  }
});
document.querySelector("#new-lawsuit")?.addEventListener("click", async (e) => {
  openPanel(0);
});
function updateCards(data) {
  const today = formatISO(/* @__PURE__ */ new Date(), { representation: "date" });
  document.querySelector("#todayCount").innerHTML = data.filter((c) => c.deadline === today).length.toString();
  document.querySelector("#weekCount").innerHTML = data.length.toString();
  document.querySelector("#activeCount").innerHTML = data.filter((c) => c.status === "aberto").length.toString();
}
function searchLawsuits(term) {
  const data = JSON.parse(sessionStorage.getItem("lawsuits"));
  let filtered = [...data];
  if (activeFilters.circuit) filtered = filtered.filter((l) => l.circuit === activeFilters.circuit);
  if (activeFilters.status !== "") filtered = filtered.filter((l) => String(l.status) === activeFilters.status);
  if (activeFilters.side) {
    const isDefendant = activeFilters.side === "Passivo";
    filtered = filtered.filter((l) => l.isDefendant === isDefendant);
  }
  if (activeFilters.assignedTo) {
    filtered = filtered.filter(
      (l) => Array.isArray(l.defender) ? false : l.defender?.nome === activeFilters.assignedTo
    );
  }
  if (term) {
    filtered = filtered.filter(
      (c) => c.assisted.toUpperCase().includes(term.toUpperCase()) || c.number.includes(term)
    );
  }
  updateCards(filtered);
  renderTable(filtered);
}
//# sourceMappingURL=dashboard.js.map
