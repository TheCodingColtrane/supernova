import { getHolidays, saveHolidays } from "../service/holidays";
import { deleteLawsuits, getLawsuitStatusCount, getPendingLawsuits, getWeekLawsuits, saveLawsuits, updateLawsuits } from "../service/lawsuits";


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    let result
    try {
      switch (request.type) {
        case "SAVE_LAWSUITS":
          result = await saveLawsuits(request.payload.lawsuits);
          break;
        case "UPDATE_LAWSUITS":
          result = await updateLawsuits(request.payload.lawsuits);
          break;
        case "DELETE_LAWSUITS":
          result = await deleteLawsuits(request.payload.ids);
          break;
        case "GET_STATUS_COUNT":
          result = await getLawsuitStatusCount();
          break;
        case "GET_WEEK_LAWSUITS":
          result = await getWeekLawsuits()
          break;
        case "GET_PENDING_LAWSUITS":
          result = await getPendingLawsuits()
          break;
        case "SAVE_HOLIDAYS":
          result = await saveHolidays(request.payload.holidays)
          break;
        case "GET_HOLIDAYS":
          result = await getHolidays(request.payload.year)
      }
      sendResponse({ success: true, data: result });

    } catch (error) {
      sendResponse({ success: false, error: error });
    }

  })()
  return true;


});

