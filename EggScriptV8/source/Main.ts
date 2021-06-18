/**
  * Serve HTML.
  * @returns {GoogleAppsScript.HTML.HtmlOutput} The web app HTML page
  */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("html/Index");
}
/**
  * ID of the spreadsheet, taken from the URL.
  */
const spreadsheetId = "1ye8EY7-MXrOCxKTuLBVjQdRElEZJaQ4-Rq5DmANfqK4";
/**
 * Add data from the web app form to the spreadsheet and perform calculations.
 * @param {any} form Gathered from Index.html
 */
function processFormSubmission(form: any) {
  let spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  // Add sheet if one with title as form["sheet-select"] is not found;
  // if this condition is true, then the new sheet must be processed immediately, 
  // and the spreadsheet must be reloaded
  let validateSheetRequestArray = EggScript.newValidateSheetRequestArray(spreadsheet, form["sheet-select"]);
  if (validateSheetRequestArray.length) {
    Bus3.batchUpdate(validateSheetRequestArray, spreadsheetId);
    spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  }
  // Append the form submission data to the appropriate sheet
  let formSubmissionSheet = Bus3.getSheetFromTitle(spreadsheet, form["sheet-select"]);
  let formSubmissionRowData = Bus3.newRowData();
  let winLoseCellData = Bus3.newCellData(Boolean(form["win-lose"]));
  let stockCountStartCellData = Bus3.newCellData(form["stock-count-start"]);
  let stockCountEndCellData = Bus3.newCellData(form["stock-count-end"]);
  formSubmissionRowData.values.push(winLoseCellData, stockCountStartCellData, stockCountEndCellData);
  let formSubmissionRows = [formSubmissionRowData];
  let formSubmissionFields = "userEnteredValue";
  let formSheetNewSubmissionRowNumber = Bus3.getDimensionLength(formSubmissionSheet, "A") + 1;
  let formSubmissionGridRange = Bus3.newGridRange(formSubmissionSheet, 
    "A" + formSheetNewSubmissionRowNumber + ":C" + formSheetNewSubmissionRowNumber);
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newUpdateCellsRequest(formSubmissionRows, formSubmissionFields, formSubmissionGridRange));
  // Push an entry to formSubmissionStack
  let extraDataSheet = Bus3.getSheetFromTitle(spreadsheet, "extra-data");
  let formSubmissionStackRowData = Bus3.newRowData();
  formSubmissionStackRowData.values.push(Bus3.newCellData(form["sheet-select"]));
  let formSubmissionStackRows = [formSubmissionStackRowData];
  let formSubmissionStackFields = "userEnteredValue";
  let formSubmissionStackGridRange = Bus3.newGridRange(extraDataSheet, 
    "D" + (extraDataSheet.data[0].rowData[0].values[3].toString() === "{}" ? 1 : 
    Bus3.getDimensionLength(extraDataSheet, "D") + 1));
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newUpdateCellsRequest(formSubmissionStackRows, formSubmissionStackFields, formSubmissionStackGridRange));
  // Update the calculation sheets
  // requestArrayPush() isn't used here because the formula calculations are already a Request[]
  Array.prototype.push.apply(requestArray,
    EggScript.newFormulaCalculationRequestArray(spreadsheet, form["sheet-select"]));
  // Update the stock price chart
  Bus3.requestArrayPush(requestArray, "updateChartSpec", EggScript.newUpdateStockPriceChartRequest(spreadsheet));
  // Update the spreadsheet
  Bus3.batchUpdate(requestArray, spreadsheetId);
}
/**
  * Revert the last data entry on the spreadsheet.
  * @returns {number} gaffeCounter, i.e. how many mistakes have been made so far
  */
function processFormUndo() {
  let spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  let extraDataSheet = Bus3.getSheetFromTitle(spreadsheet, "extra-data");
  // Effectively ++gaffeCounter
  let gaffeCounter = extraDataSheet.data[0].rowData && extraDataSheet.data[0].rowData[0].values[5] &&
    extraDataSheet.data[0].rowData[0].values[5].userEnteredValue ?
    extraDataSheet.data[0].rowData[0].values[5].userEnteredValue.numberValue + 1 : 1;
  let gaffeCounterRowData = Bus3.newRowData();
  gaffeCounterRowData.values.push(Bus3.newCellData(gaffeCounter));
  let gaffeCounterRows = [gaffeCounterRowData];
  let gaffeCounterFields = "userEnteredValue";
  let gaffeCounterGridRange = Bus3.newGridRange(extraDataSheet, "F1");
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newUpdateCellsRequest(gaffeCounterRows, gaffeCounterFields, gaffeCounterGridRange));
  // Pop an entry from formSubmissionStack
  let formSubmissionStackLength = Bus3.getDimensionLength(extraDataSheet, "D");
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newClearCellRequest(extraDataSheet, "D" + formSubmissionStackLength));
  // Clear the last row of the relevant sheet
  let formSubmissionStackLastFormTitle = 
    extraDataSheet.data[0].rowData[formSubmissionStackLength - 1].values[3].userEnteredValue.stringValue;
  let formSubmissionStackLastFormSheet = Bus3.getSheetFromTitle(spreadsheet, formSubmissionStackLastFormTitle);
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newClearDimensionRequest(formSubmissionStackLastFormSheet, 
    Bus3.getDimensionLength(formSubmissionStackLastFormSheet, "A")));
  // Pop an entry from the relevant column in each of the calculation sheets
  Array.prototype.push.apply(requestArray,
    EggScript.newUndoCalculationRequestArray(spreadsheet, formSubmissionStackLastFormTitle));
  // Update the spreadsheet
  Bus3.batchUpdate(requestArray, spreadsheetId);
  return gaffeCounter;
}
/**
  * Clear / delete all user-entered data
  */
function resetSpreadsheet() {
  // Disabling this for now so as to not accidentally delete all the data points
  return;
  let spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  spreadsheet.sheets.forEach(function(sheet) {
    switch (sheet.properties.title) {
      case "stock-price-chart":
        // The chart breaks when it refers to a series that doesn't exist anymore,
        // but it fixes itself after being reloaded, so it sort of works to just
        // leave it alone for now, although it really should be better dealt with later
        break;
      case "extra-data":
        // Clear gaffeCounter and formSubmissionStack
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearCellRequest(sheet, "F1"));
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearDimensionRequest(sheet, "D"));
        break;
      case "stock-price-initial":
      case "stock-loss":
      case "average-stock-loss":
      case "stock-loss-weight":
      case "weighted-average-stock-loss":
      case "win-lose-formula":
      case "stock-price-delta":
      case "stock-price":
        // Clear calculation sheets of formulas and whatnot
        for (let index = 0; index < Bus3.getDimensionLength(sheet, "1"); ++index) {
          Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearDimensionRequest(sheet, 
            Bus3.fromDimensionIndex(index, "COLUMNS")));
        }
        break;
      default:
        // Delete all form submission data sheets
        let deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        Bus3.requestArrayPush(requestArray, "deleteSheet", deleteSheetRequest);
        break;
    }
  });
  Bus3.batchUpdate(requestArray, spreadsheetId);
}
/**
  * Do the thing
  */
function testFunction() {
  let spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  let sheet = Bus3.getSheetFromTitle(spreadsheet, "test-sheet");
  // Basic test of Bus3
  if (0) {
    Logger.log(sheet);
  }
  // Add dimension and cell data
  // TIL that order of requests matters; must have appendDimension before updateCells
  if (1) {
    let appendDimensionRequest = Bus3.newAppendDimensionRequest(sheet, "COLUMNS", 1);
    Bus3.requestArrayPush(requestArray, "appendDimension", appendDimensionRequest);
    let updateSingleCellRequest = Bus3.newUpdateSingleCellRequest(sheet, "test again", "AB2");
    Bus3.requestArrayPush(requestArray, "updateCells", updateSingleCellRequest);
  }
  Bus3.batchUpdate(requestArray, spreadsheetId);
}
