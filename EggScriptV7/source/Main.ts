const EggScript = EggScriptNamespace.EggScript;
// Serve HTML
function doGet() {
  return HtmlService.createHtmlOutputFromFile("build/Index");
}
// ID of the spreadsheet, taken from the URL
const spreadsheetId = "1S3qZrtqr8pXaJLLIPvDn20awyYAhs4jEHfzT178bOUs";
// Revamp of processFormSubmission() using only one get() call (usually) and one batchUpdate() call
function processFormSubmission(form: any) {
  let spreadsheet = EggScript.getSpreadsheet(spreadsheetId);
  let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  // Add sheet if one with title as form["sheet-select"] is not found;
  // if this condition is true, then the new sheet must be processed immediately, 
  // and the spreadsheet must be reloaded
  let validateSheetRequestArray = EggScript.validateSheetRequestArray(spreadsheet, form["sheet-select"]);
  if (validateSheetRequestArray) {
    EggScript.batchUpdate(validateSheetRequestArray, spreadsheetId);
    spreadsheet = EggScript.getSpreadsheet(spreadsheetId);
  }
  // Append the form submission data to the appropriate sheet
  let formSubmissionSheet = EggScript.getSheetFromTitle(spreadsheet, form["sheet-select"]);
  let formSubmissionRowData = EggScript.newRowData();
  let winLoseCellData = EggScript.newCellData(Boolean(form["win-lose"]));
  let stockCountStartCellData = EggScript.newCellData(form["stock-count-start"]);
  let stockCountEndCellData = EggScript.newCellData(form["stock-count-end"]);
  formSubmissionRowData.values.push(winLoseCellData, stockCountStartCellData, stockCountEndCellData);
  let formSubmissionRows = [formSubmissionRowData];
  let formSubmissionFields = "userEnteredValue";
  let formSheetNewSubmissionRowNumber = EggScript.getDimensionLength(formSubmissionSheet, "A") + 1;
  let formSubmissionGridRange = EggScript.newGridRange(formSubmissionSheet.properties.sheetId, 
    "A" + formSheetNewSubmissionRowNumber + ":C" + formSheetNewSubmissionRowNumber);
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(formSubmissionRows, formSubmissionFields, formSubmissionGridRange));
  // Push an entry to formSubmissionStack
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  let formSubmissionStackRowData = EggScript.newRowData();
  formSubmissionStackRowData.values.push(EggScript.newCellData(form["sheet-select"]));
  let formSubmissionStackRows = [formSubmissionStackRowData];
  let formSubmissionStackFields = "userEnteredValue";
  let formSubmissionStackGridRange = EggScript.newGridRange(extraDataSheet.properties.sheetId, 
    "D" + (extraDataSheet.data[0].rowData[0].values[3].toString() === "{}" ? 1 : 
    EggScript.getDimensionLength(extraDataSheet, "D") + 1));
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(formSubmissionStackRows, formSubmissionStackFields, formSubmissionStackGridRange));
  // Update the calculation sheets
  // requestArrayPush() isn't used here because the formula calculations are already in requestArray format
  Array.prototype.push.apply(requestArray,
    EggScript.formulaCalculationRequestArray(spreadsheet, form["sheet-select"]));
  // Update the stock price chart
  EggScript.requestArrayPush(requestArray, "updateChartSpec", EggScript.updateStockPriceChartRequest(spreadsheet));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray, spreadsheetId);
}
// Similar to processFormSubmission() above, but for processFormUndo() instead
function processFormUndo() {
  let spreadsheet = EggScript.getSpreadsheet(spreadsheetId);
  let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  // Effectively ++gaffeCounter
  let gaffeCounter = extraDataSheet.data[0].rowData && extraDataSheet.data[0].rowData[0].values[5] &&
    extraDataSheet.data[0].rowData[0].values[5].userEnteredValue ?
    extraDataSheet.data[0].rowData[0].values[5].userEnteredValue.numberValue + 1 : 1;
  let gaffeCounterRowData = EggScript.newRowData();
  gaffeCounterRowData.values.push(EggScript.newCellData(gaffeCounter));
  let gaffeCounterRows = [gaffeCounterRowData];
  let gaffeCounterFields = "userEnteredValue";
  let gaffeCounterGridRange = EggScript.newGridRange(extraDataSheet.properties.sheetId, "F1");
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(gaffeCounterRows, gaffeCounterFields, gaffeCounterGridRange));
  // Pop an entry from formSubmissionStack
  let formSubmissionStackLength = EggScript.getDimensionLength(extraDataSheet, "D");
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.clearCellRequest(extraDataSheet, "D" + formSubmissionStackLength));
  // Clear the last row of the relevant sheet
  let formSubmissionStackLastFormTitle = 
    extraDataSheet.data[0].rowData[formSubmissionStackLength - 1].values[3].userEnteredValue.stringValue;
  let formSubmissionStackLastFormSheet = EggScript.getSheetFromTitle(spreadsheet, formSubmissionStackLastFormTitle);
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.clearDimensionRequest(formSubmissionStackLastFormSheet, 
    EggScript.getDimensionLength(formSubmissionStackLastFormSheet, "A")));
  // Pop an entry from the relevant column in each of the calculation sheets
  Array.prototype.push.apply(requestArray,
    EggScript.undoCalculationRequestArray(spreadsheet, formSubmissionStackLastFormTitle));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray, spreadsheetId);
  return gaffeCounter;
}
// Redone version of resetSpreadsheet() using only two API calls
// Clears all but stock-price-chart and extra-data
function resetSpreadsheet() {
  let spreadsheet = EggScript.getSpreadsheet(spreadsheetId);
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
        EggScript.requestArrayPush(requestArray, "updateCells", EggScript.clearCellRequest(sheet, "F1"));
        EggScript.requestArrayPush(requestArray, "updateCells", EggScript.clearDimensionRequest(sheet, "D"));
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
        for (let index = 0; index < EggScript.getDimensionLength(sheet, "1"); ++index) {
          EggScript.requestArrayPush(requestArray, "updateCells", EggScript.clearDimensionRequest(sheet, 
            EggScript.fromDimensionIndex(index, "COLUMNS")));
        }
        break;
      default:
        // Delete all form submission data sheets
        let deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        EggScript.requestArrayPush(requestArray, "deleteSheet", deleteSheetRequest);
        break;
    }
  });
  EggScript.batchUpdate(requestArray, spreadsheetId);
}
