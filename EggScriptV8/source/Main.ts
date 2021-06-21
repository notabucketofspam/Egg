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
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  // Add sheet if one with title as form["sheet-select"] is not found;
  // if this condition is true, then the new sheet must be processed immediately, 
  // and the spreadsheet must be reloaded
  const validateSheetRequestArray = EggScript.newValidateSheetRequestArray(spreadsheet, form["sheet-select"]);
  if (validateSheetRequestArray.length) {
    Bus3.batchUpdate(validateSheetRequestArray, spreadsheetId);
    spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  }
  // Append the form submission data to the appropriate sheet
  const formSubmissionSheet = Bus3.getSheetFromTitle(spreadsheet, form["sheet-select"]);
  const formSubmissionRowData = Bus3.newRowData();
  const winLoseCellData = Bus3.newCellData(Boolean(form["win-lose"]));
  const stockCountStartCellData = Bus3.newCellData(form["stock-count-start"]);
  const stockCountEndCellData = Bus3.newCellData(form["stock-count-end"]);
  formSubmissionRowData.values.push(winLoseCellData, stockCountStartCellData, stockCountEndCellData);
  const formSubmissionRows = [formSubmissionRowData];
  const formSubmissionFields = "userEnteredValue";
  const formSheetNewSubmissionRowNumber = Bus3.getDimensionLength(formSubmissionSheet, "A") + 1;
  const formSubmissionGridRange = Bus3.newGridRange(formSubmissionSheet, 
    "A" + formSheetNewSubmissionRowNumber + ":C" + formSheetNewSubmissionRowNumber);
  // Check if formSubmissionSheet is out of rows
  if (formSubmissionSheet.data[0].rowData.length >= formSubmissionSheet.properties.gridProperties.rowCount) {
    Bus3.requestArrayPush(requestArray, "appendDimension",
      Bus3.newAppendDimensionRequest(formSubmissionSheet, "ROWS", 1));
  }
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newUpdateCellsRequest(formSubmissionRows, formSubmissionFields, formSubmissionGridRange));
  // Push an entry to form-submission-stack
  const formSubmissionStackSheet = Bus3.getSheetFromTitle(spreadsheet, "form-submission-stack");
  const formSubmissionStackRowData = Bus3.newRowData();
  formSubmissionStackRowData.values.push(Bus3.newCellData(form["sheet-select"]));
  const formSubmissionStackRows = [formSubmissionStackRowData];
  const formSubmissionStackFields = "userEnteredValue";
  const formSubmissionStackGridRange = Bus3.newGridRange(formSubmissionStackSheet,
    "A" + String(Bus3.isEmptyRange(formSubmissionStackSheet, "A1") ? 1 :
      Bus3.getDimensionLength(formSubmissionStackSheet, "A") + 1));
  // Check to see if formSubmissionStackSheet is out of rows
  if (formSubmissionStackSheet.data[0].rowData.length >= formSubmissionStackSheet.properties.gridProperties.rowCount) {
    Bus3.requestArrayPush(requestArray, "appendDimension",
      Bus3.newAppendDimensionRequest(formSubmissionStackSheet, "ROWS", 1));
  }
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newUpdateCellsRequest(formSubmissionStackRows, formSubmissionStackFields, formSubmissionStackGridRange));
  // Update the calculation sheets
  const formulaCalculationRequestArray = EggScript.newFormulaCalculationRequestArray(spreadsheet, formSubmissionSheet,
    EggScript.getLastEntryRowFromFormSheet(formSubmissionSheet));
  // requestArrayPush() isn't used here because the formula calculations are already a Request[]
  Array.prototype.push.apply(requestArray, formulaCalculationRequestArray);
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
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  const extraDataSheet = Bus3.getSheetFromTitle(spreadsheet, "extra-data");
  // Effectively ++gaffeCounter
  const gaffeCounter = extraDataSheet.data[0].rowData && extraDataSheet.data[0].rowData[0].values[3] &&
    extraDataSheet.data[0].rowData[0].values[3].userEnteredValue ?
    extraDataSheet.data[0].rowData[0].values[3].userEnteredValue.numberValue + 1 : 1;
  const gaffeCounterRowData = Bus3.newRowData();
  gaffeCounterRowData.values.push(Bus3.newCellData(gaffeCounter));
  const gaffeCounterRows = [gaffeCounterRowData];
  const gaffeCounterFields = "userEnteredValue";
  const gaffeCounterGridRange = Bus3.newGridRange(extraDataSheet, "D1");
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newUpdateCellsRequest(gaffeCounterRows, gaffeCounterFields, gaffeCounterGridRange));
  // Pop an entry from form-submission-stack
  const formSubmissionStackSheet = Bus3.getSheetFromTitle(spreadsheet, "form-submission-stack");
  const formSubmissionStackLength = Bus3.getDimensionLength(formSubmissionStackSheet, "A");
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newClearCellRequest(formSubmissionStackSheet, "A" + formSubmissionStackLength));
  // Clear the last row of the relevant sheet
  const formSubmissionStackLastFormTitle = 
    formSubmissionStackSheet.data[0].rowData[formSubmissionStackLength - 1].values[0].userEnteredValue.stringValue;
  const formSubmissionStackLastFormSheet = Bus3.getSheetFromTitle(spreadsheet, formSubmissionStackLastFormTitle);
  Bus3.requestArrayPush(requestArray, "updateCells",
    Bus3.newClearDimensionRequest(formSubmissionStackLastFormSheet,
    Bus3.getDimensionLength(formSubmissionStackLastFormSheet, "A")));
  // Pop an entry from the relevant column in each of the calculation sheets
  const undoCalculationRequestArray = EggScript.newUndoCalculationRequestArray(spreadsheet,
    formSubmissionStackLastFormSheet);
  Array.prototype.push.apply(requestArray, undoCalculationRequestArray);
  // Update the spreadsheet
  Bus3.batchUpdate(requestArray, spreadsheetId);
  return gaffeCounter;
}
/**
 * Clear / delete all user-entered data.
 */
function resetSpreadsheet() {
  // Disabling this for now so as to not accidentally delete all the data points
  return;
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  spreadsheet.sheets.forEach(function(sheet) {
    switch (sheet.properties.title) {
      case "stock-price-chart":
        // The chart breaks when it refers to a series that doesn't exist anymore,
        // but it fixes itself after being reloaded, so it sort of works to just
        // leave it alone for now, although it really should be better dealt with later
        break;
      case "extra-data":
        // Clear gaffeCounter
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearCellRequest(sheet, "D1"));
        break;
      case "form-submission-stack":
        // Clear form-submission-stack
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearDimensionRequest(sheet, "A"));
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
        const deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        Bus3.requestArrayPush(requestArray, "deleteSheet", deleteSheetRequest);
        break;
    }
  });
  Bus3.batchUpdate(requestArray, spreadsheetId);
}
/**
 * Reevaluate all of the calculations, but leave user-entered data untouched.
 * Useful for when the price model is changed.
 */
function resetCalculationSheets() {
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  EggScript.calculationTitleArray.forEach(function(calculationTitle) {
    // Do nothing to the initial price
    if (calculationTitle === "stock-price-initial")
      return;
    const calculationSheet = Bus3.getSheetFromTitle(spreadsheet, calculationTitle);
    calculationSheet.data[0].rowData[0].values.forEach(function(formSheetTitleCellData, calculationSheetValuesIndex) {
      // Clear column on the calculation sheet
      const clearDimensionRows: GoogleAppsScript.Sheets.Schema.RowData[] = [];
      // Start index at 1 to skip title at top of sheet
      for (let clearDimensionRowIndex = 1;
        clearDimensionRowIndex < calculationSheet.properties.gridProperties.rowCount; ++clearDimensionRowIndex) {
        clearDimensionRows.push(Bus3.newRowData());
      }
      const clearDimensionFields = "userEnteredValue";
      const clearDimensionColumn = Bus3.fromDimensionIndex(calculationSheetValuesIndex, "COLUMNS");
      // Begin at A1 row 2 to skip title again
      const clearDimensionGridRange = Bus3.newGridRange(calculationSheet,
        `${clearDimensionColumn}2:${clearDimensionColumn}`);
      Bus3.requestArrayPush(requestArray, "updateCells",
        Bus3.newUpdateCellsRequest(clearDimensionRows, clearDimensionFields, clearDimensionGridRange));
      // Enter the calculations again
      const formSheet = Bus3.getSheetFromTitle(spreadsheet, formSheetTitleCellData.userEnteredValue.stringValue);
      const formSheetColumnLength = Bus3.getDimensionLength(formSheet, "A");
      for (let formSheetEntryRowIndex = 0; formSheetEntryRowIndex < formSheetColumnLength; ++formSheetEntryRowIndex) {
        const formulaCalculationRequestArray = EggScript.newFormulaCalculationRequestArray(spreadsheet, formSheet,
          Bus3.fromDimensionIndex(formSheetEntryRowIndex, "ROWS"));
        Array.prototype.push.apply(requestArray, formulaCalculationRequestArray);
      }
    });
  });
  Bus3.batchUpdate(requestArray, spreadsheetId);
}
