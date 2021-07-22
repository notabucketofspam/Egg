const spreadsheetId = "1bGDpj6Ari2GMAmZC6zehs7x91tdty5tyqQUODqs3Nt0";
// Serve HTML
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}
// Check spreadsheet validity, append a row to the relevant sheet, and push formSubmissionStack
function processFormSubmission(form) {
  Logger.log(form);
  let batchUpdateValuesValueRangeArray = [];
  checkSheetExistence(form["sheet-select"]);
  let formSheetSelectLength = getDimensionLength(form["sheet-select"], "A");
  let formSubmissionValueRange = Sheets.newValueRange();
  formSubmissionValueRange.values = [[Boolean(form["win-lose"]), form["stock-count-start"], form["stock-count-end"]]];
  formSubmissionValueRange.range = 
    form["sheet-select"] + "!A" + ++formSheetSelectLength + ":C" + formSheetSelectLength;
  batchUpdateValuesValueRangeArray.push(formSubmissionValueRange);
  let formSubmissionStackPushValueRange = Sheets.newValueRange();
  formSubmissionStackPushValueRange.values = [[form["sheet-select"]]];
  formSubmissionStackPushValueRange.range = "extra-data!D" + (getDimensionLength("extra-data", "D") + 1);
  batchUpdateValuesValueRangeArray.push(formSubmissionStackPushValueRange);
  let batchUpdateValuesRequest = Sheets.newBatchUpdateValuesRequest();
  batchUpdateValuesRequest.data = batchUpdateValuesValueRangeArray;
  batchUpdateValuesRequest.valueInputOption = "USER_ENTERED";
  Sheets.Spreadsheets.Values.batchUpdate(batchUpdateValuesRequest, spreadsheetId);
}
// Add to gaffeCounter, clear the last row from the relevant sheet, and pop formSubmissionStack
function processFormUndo() {
  let batchGetValuesResponse = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, 
    {ranges: ["extra-data!B1", "extra-data!D:D"], majorDimension: "COLUMNS"});
  let batchUpdateValuesValueRangeArray = [];
  let gaffeCounter = batchGetValuesResponse.valueRanges[0].values ? 
    ++batchGetValuesResponse.valueRanges[0].values[0] : 1;
  let gaffeCounterValueRange = Sheets.newValueRange();
  gaffeCounterValueRange.values = [[gaffeCounter]];
  gaffeCounterValueRange.range = "extra-data!B1";
  batchUpdateValuesValueRangeArray.push(gaffeCounterValueRange);
  let formSubmissionStack = batchGetValuesResponse.valueRanges[1];
  if (formSubmissionStack.values) {
    let formSubmissionStackValuesLength = formSubmissionStack.values[0].length;
    let formSubmissionStackValuesLastForm = formSubmissionStack.values[0][formSubmissionStackValuesLength - 1];
    arrayValidPush(batchUpdateValuesValueRangeArray, 
      newClearDimensionValueRange(formSubmissionStackValuesLastForm, 
      getDimensionLength(formSubmissionStackValuesLastForm, "A")));
    let formSubmissionStackPopValueRange = Sheets.newValueRange();
    formSubmissionStackPopValueRange.values = [[""]];
    formSubmissionStackPopValueRange.range = "extra-data!D" + formSubmissionStackValuesLength;
    batchUpdateValuesValueRangeArray.push(formSubmissionStackPopValueRange);
  }
  let batchUpdateValuesRequest = Sheets.newBatchUpdateValuesRequest();
  batchUpdateValuesRequest.data = batchUpdateValuesValueRangeArray;
  batchUpdateValuesRequest.valueInputOption = "USER_ENTERED";
  Sheets.Spreadsheets.Values.batchUpdate(batchUpdateValuesRequest, spreadsheetId);
  return gaffeCounter;
}
// If a sheet with the specified title doesn't exist, create one and add the title to stock-price
function checkSheetExistence(sheetPropertiesTitle) {
  let spreadsheetSheetPropertiesTitleArray = [];
  Array.from(Sheets.Spreadsheets.get(spreadsheetId).sheets).forEach(sheet => {
    spreadsheetSheetPropertiesTitleArray.push(sheet.properties.title);
  });
  if (!spreadsheetSheetPropertiesTitleArray.includes(sheetPropertiesTitle)) {
    let addSheetRequest = Sheets.newAddSheetRequest();
    addSheetRequest.properties = Sheets.newSheetProperties();
    addSheetRequest.properties.title = sheetPropertiesTitle;
    let requestArray = [Sheets.newRequest()];
    requestArray[0].addSheet = addSheetRequest;
    let batchUpdateSpreadsheetRequest = Sheets.newBatchUpdateSpreadsheetRequest();
    batchUpdateSpreadsheetRequest.requests = requestArray;
    Sheets.Spreadsheets.batchUpdate(batchUpdateSpreadsheetRequest, spreadsheetId);
    let stockPriceColumnList = Sheets.Spreadsheets.Values.get(spreadsheetId, "stock-price!1:1");
    let stockPriceColumnListArray = stockPriceColumnList.values ? stockPriceColumnList.values[0] : [];
    stockPriceColumnListArray.push(sheetPropertiesTitle);
    let stockPriceColumnValueRange = Sheets.newValueRange();
    stockPriceColumnValueRange.values = [stockPriceColumnListArray];
    Sheets.Spreadsheets.Values.update(stockPriceColumnValueRange, spreadsheetId, 
      "stock-price!1:1", {valueInputOption: "USER_ENTERED"}
    );
  }
}
// Size of a row or column on a sheet
function getDimensionLength(sheetPropertiesTitle, dimension) {
  let batchGetValuesResponse = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, 
    {ranges: [sheetPropertiesTitle, sheetPropertiesTitle + "!" + dimension + ":" + dimension]});
  return batchGetValuesResponse.valueRanges[0] && batchGetValuesResponse.valueRanges[1].values ? 
    Number.isNaN(Number.parseInt(dimension)) ? 
    batchGetValuesResponse.valueRanges[1].values.length : 
    batchGetValuesResponse.valueRanges[1].values[0].length : 0;
}
// ValueRange which deletes all data from a row or column on a sheet
function newClearDimensionValueRange(sheetPropertiesTitle, dimension) {
  let dimensionLength = getDimensionLength(sheetPropertiesTitle, dimension);
  if (dimensionLength) {
    let clearDimensionArray = [];
    let clearDimensionArrayIndex;
    for (clearDimensionArrayIndex = 0; clearDimensionArrayIndex < dimensionLength; ++clearDimensionArrayIndex)
      clearDimensionArray.push("");
    let clearDimensionValueRange = Sheets.newValueRange();
    clearDimensionValueRange.values = [clearDimensionArray];
    clearDimensionValueRange.majorDimension = Number.isNaN(Number.parseInt(dimension)) ? "COLUMNS" : "ROWS";
    clearDimensionValueRange.range = sheetPropertiesTitle + "!" + dimension + ":" + dimension;
    return clearDimensionValueRange;
  }
}
// If an object is valid, push it to the specified array
function arrayValidPush(array, object) {
  if (object) array.push(object);
}
// Delete all form submission sheets and reset the remaining sheets to default values
function resetSpreadsheet() {
  let batchUpdateValuesValueRangeArray = [];
  let requestArray = [];
  Array.from(Sheets.Spreadsheets.get(spreadsheetId).sheets).forEach(sheet => {
    switch (sheet.properties.title) {
      case "extra-data":
        arrayValidPush(batchUpdateValuesValueRangeArray, 
          newClearDimensionValueRange("extra-data", "B"));
        arrayValidPush(batchUpdateValuesValueRangeArray, 
          newClearDimensionValueRange("extra-data", "D"));
        break;
      case "stock-price":
        arrayValidPush(batchUpdateValuesValueRangeArray,
          newClearDimensionValueRange("stock-price", "1"));
        break;
      default:
        requestArray.push(Sheets.newRequest());
        let deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        requestArray[requestArray.length - 1].deleteSheet = deleteSheetRequest;
        break;
    }
  });
  if (batchUpdateValuesValueRangeArray) {
    let batchUpdateValuesRequest = Sheets.newBatchUpdateValuesRequest();
    batchUpdateValuesRequest.data = batchUpdateValuesValueRangeArray;
    batchUpdateValuesRequest.valueInputOption = "USER_ENTERED";
    Sheets.Spreadsheets.Values.batchUpdate(batchUpdateValuesRequest, spreadsheetId);
  }
  if (requestArray.length) {
    let batchUpdateSpreadsheetRequest = Sheets.newBatchUpdateSpreadsheetRequest();
    batchUpdateSpreadsheetRequest.requests = requestArray;
    Sheets.Spreadsheets.batchUpdate(batchUpdateSpreadsheetRequest, spreadsheetId);
  }
}
