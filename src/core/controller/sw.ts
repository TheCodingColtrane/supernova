import { getHolidays } from "../service/holidays";
import { getLawsuitStatusCount, getPendingLawsuits, getWeekLawsuits, saveLawsuits } from "../service/lawsuits";


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    let result
    try {
      switch (request.type) {
        case "SAVE_LAWSUITS":
          result = await saveLawsuits(request.payload.lawsuits);
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

