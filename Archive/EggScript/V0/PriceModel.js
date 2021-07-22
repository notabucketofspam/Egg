const spreadsheetId = "1TDArJau9Dojk1BF_-VQgWEsrULig-nardpAS8jpeyRo";
// Serve HTML
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index");
}
// Check spreadsheet validity, append a row to the relevant sheet, and push formSubmissionStack
function processFormSubmission(form) {
  Logger.log(form);
  checkSheetExistence(form["char-select"]);
  let currentRound = getDimensionLength(form["char-select"], "A");
  let roundDataValueRange = Sheets.newValueRange();
  roundDataValueRange.values = [[Boolean(form["win-lose"]), form["stock-count-start"], form["stock-count-end"]]];
  Sheets.Spreadsheets.Values.update(roundDataValueRange, spreadsheetId, 
    form["char-select"] + "!A" + ++currentRound + ":C" + currentRound, {valueInputOption: "USER_ENTERED"}
  );
  let formSubmissionStackPushValueRange = Sheets.newValueRange();
  formSubmissionStackPushValueRange.values = [[form["char-select"]]];
  Sheets.Spreadsheets.Values.update(formSubmissionStackPushValueRange, spreadsheetId, 
    "extra-data!D" + (getDimensionLength("extra-data", "D") + 1), {valueInputOption: "USER_ENTERED"}
  );
}
// Add to gaffeCounter, clear the last row from the relevant sheet, and pop formSubmissionStack
function processFormUndo() {
  let gaffeCounter = Sheets.Spreadsheets.Values.get(spreadsheetId, "extra-data!B1").values ? 
    ++Sheets.Spreadsheets.Values.get(spreadsheetId, "extra-data!B1").values[0] : 1;
  let gaffeCounterValueRange = Sheets.newValueRange();
  gaffeCounterValueRange.values = [[gaffeCounter]];
  Sheets.Spreadsheets.Values.update(gaffeCounterValueRange, spreadsheetId,
    "extra-data!B1", {valueInputOption: "USER_ENTERED"}
  );
  let formSubmissionStack = Sheets.Spreadsheets.Values.get(spreadsheetId, "extra-data!D:D", 
    {majorDimension: "COLUMNS"}
  );
  if (formSubmissionStack.values) {
    let formSubmissionStackValuesLength = formSubmissionStack.values[0].length;
    let FormSubmissionStackValuesLastForm = formSubmissionStack.values[0][formSubmissionStackValuesLength - 1];
    clearDimension(FormSubmissionStackValuesLastForm, getDimensionLength(FormSubmissionStackValuesLastForm, "A"));
    let formSubmissionStackPopValueRange = Sheets.newValueRange();
    formSubmissionStackPopValueRange.values = [[""]];
    Sheets.Spreadsheets.Values.update(formSubmissionStackPopValueRange, spreadsheetId,
      "extra-data!D" + formSubmissionStackValuesLength, {valueInputOption: "USER_ENTERED"}
    );
  }
  return gaffeCounter;
}
// Size of a row or column on a sheet
function getDimensionLength(sheetPropertiesTitle, dimension) {
  return Sheets.Spreadsheets.Values.get(spreadsheetId, sheetPropertiesTitle) &&
    Sheets.Spreadsheets.Values.get(spreadsheetId, sheetPropertiesTitle + "!" + dimension + ":" + dimension).values ? 
    Number.isNaN(Number.parseInt(dimension)) ? 
    Sheets.Spreadsheets.Values.get(spreadsheetId, sheetPropertiesTitle + "!" + dimension + ":" + dimension)
    .values.length : 
    Sheets.Spreadsheets.Values.get(spreadsheetId, sheetPropertiesTitle + "!" + dimension + ":" + dimension)
    .values[0].length : 0;
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
    let stockPriceColumnList = Sheets.Spreadsheets.Values.get(spreadsheetId, "stock-price!1:1").values ? 
      Sheets.Spreadsheets.Values.get(spreadsheetId, "stock-price!1:1").values[0] : [];
    stockPriceColumnList.push(sheetPropertiesTitle);
    let stockPriceColumnValueRange = Sheets.newValueRange();
    stockPriceColumnValueRange.values = [stockPriceColumnList];
    Sheets.Spreadsheets.Values.update(stockPriceColumnValueRange, spreadsheetId, 
      "stock-price!1:1", {valueInputOption: "USER_ENTERED"}
    );
  }
}
// Delete all data from a row or column on a sheet
function clearDimension(sheetPropertiesTitle, dimension) {
  let dimensionLength = getDimensionLength(sheetPropertiesTitle, dimension);
  if (dimensionLength) {
    let clearDimensionArray = [];
    let clearDimensionArrayIndex;
    for (clearDimensionArrayIndex = 0; clearDimensionArrayIndex < dimensionLength; ++clearDimensionArrayIndex)
      clearDimensionArray.push("");
    let clearDimensionValueRange = Sheets.newValueRange();
    clearDimensionValueRange.values = [clearDimensionArray];
    clearDimensionValueRange.majorDimension = Number.isNaN(Number.parseInt(dimension)) ? "COLUMNS" : "ROWS";
    Sheets.Spreadsheets.Values.update(clearDimensionValueRange, spreadsheetId,
      sheetPropertiesTitle + "!" + dimension + ":" + dimension, {valueInputOption: "USER_ENTERED"}
    );
  }
}
// Delete all form data sheets and reset the remaining sheets to default values
function resetSpreadsheet() {
  let requestArray = [];
  let requestArrayIndex = 0;
  Array.from(Sheets.Spreadsheets.get(spreadsheetId).sheets).forEach(sheet => {
    switch (sheet.properties.title) {
      case "extra-data":
        clearDimension("extra-data", "B");
        clearDimension("extra-data", "D");
        break;
      case "stock-price":
        clearDimension("stock-price", "1");
        break;
      default:
        requestArray.push(Sheets.newRequest());
        let deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        requestArray[requestArrayIndex].deleteSheet = deleteSheetRequest;
        ++requestArrayIndex;
        break;
    }
  });
  if (requestArray.length) {
    let batchUpdateSpreadsheetRequest = Sheets.newBatchUpdateSpreadsheetRequest();
    batchUpdateSpreadsheetRequest.requests = requestArray;
    Sheets.Spreadsheets.batchUpdate(batchUpdateSpreadsheetRequest, spreadsheetId);
  }
}
