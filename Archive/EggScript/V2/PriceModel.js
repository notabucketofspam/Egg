// const spreadsheetId = "1f3VOshPr7IvDdhio3RH_GL7tm3tf-PsQeTW3q6dEN7o";
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
      "stock-price!1:1", {valueInputOption: "USER_ENTERED"});
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

// ================== Start of new development section ==================

// ID of the spreadsheet, taken from the URL
const spreadsheetId = "1f3VOshPr7IvDdhio3RH_GL7tm3tf-PsQeTW3q6dEN7o";
// FieldMask to filter sheets.data, among other things
const spreadsheetFieldMask = "spreadsheetId,properties,spreadsheetUrl," + 
"sheets.properties,sheets.data.startRow,sheets.data.startColumn," + 
"sheets.data.rowData.values.userEnteredValue," + 
"sheets.data.rowData.values.effectiveValue," + 
"sheets.data.rowData.values.formattedValue";
// General functions for interacting with API
// Exclusively uses Sheets.Spreadsheets.batchUpdate Requests to reduce API calls
// Assumes that all sheets were obtained using spreadsheetFieldMask
class EggScript {
  // Wrapper for Sheets.Spreadsheets.get()
  static getSpreadsheet() {
    return Sheets.Spreadsheets.get(spreadsheetId, {fields: spreadsheetFieldMask});
  }
  // Check if a dimension is a column
  // Saves the headache of trying to remember what Number.blah means
  static isColumn(dimension) {
    return Number.isNaN(Number.parseInt(dimension));
  }
  // Convert a row or column to its respective zero-based index
  // Partially taken from: 
  // https://stackoverflow.com/questions/21229180/convert-column-index-into-corresponding-column-letter
  static toDimensionIndex(dimension) {
    let dimensionIndex = 0;
    if (EggScript.isColumn(dimension)) {
      let charCodeAtIndex;
      for (charCodeAtIndex = 0; charCodeAtIndex < dimension.length; ++charCodeAtIndex) {
        dimensionIndex += (dimension.charCodeAt(charCodeAtIndex) - 64) * 
          Math.pow(26, dimension.length - charCodeAtIndex - 1);
      }
    } else {
      dimensionIndex = Number.parseInt(dimension);
    }
    --dimensionIndex;
    return dimensionIndex;
  }
  // Similar to above, but in reverse; taken from the same source
  static fromDimensionIndex(dimensionIndex, majorDimension) {
    ++dimensionIndex;
    let dimension;
    if (majorDimension === "COLUMNS") {
      let currentCharCode;
      dimension = "";
      while (dimensionIndex > 0) {
        currentCharCode = (dimensionIndex - 1) % 26;
        dimension = String.fromCharCode(currentCharCode + 65) + dimension;
        dimensionIndex = (dimensionIndex - currentCharCode - 1) / 26;
      }
    } else {
      dimension = dimensionIndex;
    }
    return dimension;
  }
  // Wrapper for Sheets.newGridRange(), using a sheetId and a range (A1 notation)
  // Broken for now, only exists as a point of reference
  static newGridRangeBackup(sheetId, range) {
    let gridRange = Sheets.newGridRange();
    gridRange.sheetId = sheetId;
    if (range) {
      let rangeStart = String(range).split(":")[0];
      if (rangeStart) {
        let rangeStartStringColumnIndex = rangeStart.search(/[0-9]/g);
        let startRowIndex = rangeStart.slice(rangeStartStringColumnIndex);
        let startColumnIndex = rangeStart.slice(0, rangeStartStringColumnIndex);
        if (startRowIndex) gridRange.startRowIndex = EggScript.toDimensionIndex(startRowIndex);
        if (startColumnIndex) gridRange.startColumnIndex = EggScript.toDimensionIndex(startColumnIndex);
      }
      let rangeEnd = String(range).split(":")[1];
      if (rangeEnd) {
        let rangeEndStringColumnIndex = rangeEnd.search(/[0-9]/g);
        let endRowIndex = rangeEnd.slice(rangeEndStringColumnIndex);
        let endColumnIndex = rangeEnd.slice(0, rangeEndStringColumnIndex);
        if (endRowIndex) gridRange.endRowIndex = EggScript.toDimensionIndex(endRowIndex) + 1;
        if (endColumnIndex) gridRange.endColumnIndex = EggScript.toDimensionIndex(endColumnIndex) + 1;
      } else {
        gridRange.endRowIndex = gridRange.startRowIndex + 1;
        gridRange.endColumnIndex = gridRange.startColumnIndex + 1;
      }
    }
    return gridRange;
  }
  // Wrapper for Sheets.newGridRange(), using a sheetId and a range (A1 notation)
  // At present, it does not check against bad range inputs, so please don't mess it up
  static newGridRange(sheetId, range) {
    let gridRange = Sheets.newGridRange();
    gridRange.sheetId = sheetId;
    // Make sure that the range exists
    if (range) {
      // Don't need to check if first half of the range exists, 
      // since if it didn't then range would be invalid anyways
      let rangeStart = String(range).split(":")[0];
      let rangeStartStringRowIndex = rangeStart.search(/[0-9]/);
      let rangeStartStringColumnIndex = rangeStart.search(/[A-Z]/);
      let startRowIndex;
      let startColumnIndex;
      if (rangeStartStringRowIndex < 0) { 
        // No row in rangeStart
        startColumnIndex = rangeStart;
      } else if (rangeStartStringColumnIndex < 0) {
        // No column in rangeStart
        startRowIndex = rangeStart;
      } else {
        // Both column and row in rangeStart
        startRowIndex = rangeStart.slice(rangeStartStringRowIndex);
        startColumnIndex = rangeStart.slice(0, rangeStartStringRowIndex);
      }
      if (startRowIndex) 
        gridRange.startRowIndex = EggScript.toDimensionIndex(startRowIndex);
      if (startColumnIndex) 
        gridRange.startColumnIndex = EggScript.toDimensionIndex(startColumnIndex);
      // Set the second half of the range, if it exists
      let rangeEnd = String(range).split(":")[1];
      if (rangeEnd) {
        let rangeEndStringRowIndex = rangeEnd.search(/[0-9]/);
        let rangeEndStringColumnIndex = rangeEnd.search(/[A-Z]/);
        let endRowIndex;
        let endColumnIndex;
        if (rangeEndStringRowIndex < 0) {
          // No row in rangeEnd
          endColumnIndex = rangeEnd;
        } else if (rangeEndStringColumnIndex < 0) {
          // No column in rangeEnd
          endRowIndex = rangeEnd;
        } else {
          // Both column and row in rangeEnd
          endRowIndex = rangeEnd.slice(rangeEndStringRowIndex);
          endColumnIndex = rangeEnd.slice(0, rangeEndStringRowIndex);
        }
        if (endRowIndex) 
          gridRange.endRowIndex = EggScript.toDimensionIndex(endRowIndex) + 1;
        if (endColumnIndex) 
          gridRange.endColumnIndex = EggScript.toDimensionIndex(endColumnIndex) + 1;
      } else {
        // Case where no end of range is provided (usually when a single cell is selected)
        gridRange.endRowIndex = gridRange.startRowIndex + 1;
        gridRange.endColumnIndex = gridRange.startColumnIndex + 1;
      }
    }
    return gridRange;
  }
  // Wrapper for Sheets.newRowData()
  // Necessary since the Sheets API appears to be broken in this regard
  static newRowData() {
    return {values: []};
  }
  // Wrapper for Sheets.newCellData()
  // As with basically everything else, this assumes that the value is user-entered
  static newCellData(value) {
    let cellData = Sheets.newCellData();
    let extendedValue = EggScript.newExtendedValue(value);
    cellData.userEnteredValue = extendedValue;
    return cellData;
  }
  // Wrapper for Sheets.newExtendedValue()
  static newExtendedValue(value) {
    let extendedValue = Sheets.newExtendedValue();
    switch (typeof value) {
      case "number":
        extendedValue.numberValue = value;
        break;
      case "string":
        if (value.startsWith("=")) 
          extendedValue.formulaValue = value;
        else 
          extendedValue.stringValue = value;
        break;
      case "boolean":
        extendedValue.boolValue = value;
        break;
      default:
        let errorValue = Sheets.newErrorValue();
        errorValue.type = "ERROR";
        errorValue.message = "Bad value: EggScript.newExtendedValue()";
        extendedValue.errorValue = errorValue;
        break;
    }
    return extendedValue;
  }
  // Wrapper for Sheets.newUpdateCellsRequest()
  // Note: this assumes the union field area to be range
  static newUpdateCellsRequest(rows, fields, range) {
    let updateCellsRequest = Sheets.newUpdateCellsRequest();
    updateCellsRequest.rows = rows;
    updateCellsRequest.fields = fields;
    updateCellsRequest.range = range;
    return updateCellsRequest;
  }
  // Size of a row or column on a sheet, but it's done smarter this time
  static getDimensionLength(sheet, dimension) {
    // Make sure that the sheet exists and that it has data
    if (sheet && sheet.data[0].getRowData()) {
      let dimensionIndex = EggScript.toDimensionIndex(dimension);
      if (EggScript.isColumn(dimension)) {
        // Case where the dimension is a column
        // Note: it breaks if data is non-contiguous
        let dimensionLength = 0;
        let index;
        for (index = 0; index < sheet.data[0].getRowData().length; ++index) {
          if (sheet.data[0].getRowData()[index].values[dimensionIndex])
            ++dimensionLength;
        }
        return dimensionLength;
      } else {
        // Case where the dimension is a row
        return sheet.data[0].getRowData()[dimensionIndex].values.length;
      }
    } else {
      return 0;
    }
  }
  // Deletes all data in a row or column on a specified sheet
  // As with the rest of the UpdateCellsRequest functions, this assumes that all values are user-entered
  static newClearDimensionUpdateCellsRequest(sheet, dimension) {
    let dimensionLength = EggScript.getDimensionLength(sheet, dimension);
    let rows = [];
    if (EggScript.isColumn(dimension)) {
      // Case where the dimension is a column
      let index;
      for (index = 0; index < dimensionLength; ++index) {
        let rowData = EggScript.newRowData();
        rowData.values.push(EggScript.newCellData(""));
        rows.push(rowData);
      }
    } else {
      // Case where the dimension is a row
      let rowData = EggScript.newRowData();
      let index;
      for (index = 0; index < dimensionLength; ++index) {
        rowData.values.push(EggScript.newCellData(""));
      }
      rows.push(rowData);
    }
    let fields = "userEnteredValue";
    let gridRange = EggScript.newGridRange(sheet.properties.sheetId, dimension + ":" + dimension);
    return EggScript.newUpdateCellsRequest(rows, fields, gridRange);
  }
  // Same as above, but only for one cell
  static newClearCellUpdateCellsRequest(sheet, cell) {
    let rowData = EggScript.newRowData();
    rowData.values.push(EggScript.newCellData(""));
    let rows = [rowData];
    let fields = "userEnteredValue";
    let gridRange = EggScript.newGridRange(sheet.properties.sheetId, cell);
    return EggScript.newUpdateCellsRequest(rows, fields, gridRange);
  }
  // If the spreadsheet doesn't contain a sheet with the specified title, 
  // create a new AddSheetRequest and append the title to the top of stock-price (via an UpdateCellsRequest)
  // Note: this returns a request array, instead of a single request like most of the other functions.
  // On top of that, it takes in the whole spreadsheet as a parameter instead of a single sheet
  static validateSheetRequestArray(spreadsheet, title) {
    let requestArray = [];
    if (!EggScript.getSheetFromTitle(spreadsheet, title)) {
      let addSheetRequest = Sheets.newAddSheetRequest();
      addSheetRequest.properties = Sheets.newSheetProperties();
      addSheetRequest.properties.title = title;
      requestArray.push(Sheets.newRequest());
      requestArray[requestArray.length - 1].addSheet = addSheetRequest;
      let stockPriceSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-price");
      let stockPriceColumnListRowData = 
        stockPriceSheet.data[0].getRowData() && stockPriceSheet.data[0].getRowData()[0] ? 
        stockPriceSheet.data[0].getRowData()[0] : EggScript.newRowData();
      stockPriceColumnListRowData.values.push(EggScript.newCellData(title));
      let rows = [stockPriceColumnListRowData];
      let fields = "userEnteredValue";
      let gridRange = EggScript.newGridRange(stockPriceSheet.properties.sheetId, "1:1");
      requestArray.push(Sheets.newRequest());
      requestArray[requestArray.length - 1].updateCells = 
        EggScript.newUpdateCellsRequest(rows, fields, gridRange);
    }
    return requestArray;
  }
  // Wrapper for Sheets.Spreadsheets.batchUpdate(); makes sure that the array isn't empty first
  static batchUpdate(requestArray) {
    if (requestArray.length) {
      let batchUpdateSpreadsheetRequest = Sheets.newBatchUpdateSpreadsheetRequest();
      batchUpdateSpreadsheetRequest.requests = requestArray;
      Sheets.Spreadsheets.batchUpdate(batchUpdateSpreadsheetRequest, spreadsheetId);
    }
  }
  // Prevents null values from getting pushed into the array
  static validArrayPush(array, ...args) {
    Array.from(args).forEach(arg => {
      if (arg) array.push(arg);
    });
  }
  // Does exactly what it says on the tin
  static getSheetFromTitle(spreadsheet, title) {
    let titleArray = [];
    Array.from(spreadsheet.sheets).forEach(sheet => {
      titleArray.push(sheet.properties.title);
    });
    if (titleArray.includes(title)) 
      return spreadsheet.sheets[titleArray.indexOf(title)];
    else 
      return null;
  }
  // Taken directly from:
  // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
  static isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }
  // Wrapper for pushing a new UpdateCellsRequest to a requestArray
  static requestArrayUpdateCellsRequestPush(requestArray, updateCellsRequest) {
    if (updateCellsRequest) {
      requestArray.push(Sheets.newRequest());
      requestArray[requestArray.length - 1].updateCells = updateCellsRequest;
    }
  }
}
// Revamp of processFormSubmission() using only one get() call (usually) and one batchUpdate() call
function processFormSubmissionRevamp(form) {
  Logger.log(form);
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  // Add sheet if one with title as form["sheet-select"] is not found;
  // if this condition is true, then the new sheet must be processed immediately, 
  // and the spreadsheet must be reloaded
  let validateSheetRequestArray = EggScript.validateSheetRequestArray(spreadsheet, form["sheet-select"]);
  if (validateSheetRequestArray) {
    EggScript.batchUpdate(validateSheetRequestArray);
    spreadsheet = EggScript.getSpreadsheet();
  }
  // Append the form data to the appropriate sheet
  let formSubmissionSheet = EggScript.getSheetFromTitle(spreadsheet, form["sheet-select"]);
  let formSubmissionRowData = EggScript.newRowData();
  let winLoseCellData = EggScript.newCellData(Boolean(form["win-lose"]));
  let stockCountStartCellData = EggScript.newCellData(form["stock-count-start"]);
  let stockCountEndCellData = EggScript.newCellData(form["stock-count-end"]);
  EggScript.validArrayPush(formSubmissionRowData.values, 
    winLoseCellData, stockCountStartCellData, stockCountEndCellData);
  let formSubmissionRows = [formSubmissionRowData];
  let formSubmissionFields = "userEnteredValue";
  let formSheetNewEntryRow = EggScript.getDimensionLength(formSubmissionSheet, "A") + 1;
  let formSubmissionGridRange = EggScript.newGridRange(formSubmissionSheet.properties.sheetId, 
    "A" + formSheetNewEntryRow + ":C" + formSheetNewEntryRow);
  EggScript.requestArrayUpdateCellsRequestPush(requestArray, 
    EggScript.newUpdateCellsRequest(formSubmissionRows, formSubmissionFields, formSubmissionGridRange));
  // Push an entry to formSubmissionStack
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  let formSubmissionStackRowData = EggScript.newRowData();
  EggScript.validArrayPush(formSubmissionStackRowData.values, EggScript.newCellData(form["sheet-select"]));
  let formSubmissionStackRows = [formSubmissionStackRowData];
  let formSubmissionStackFields = "userEnteredValue";
  let formSubmissionStackGridRange = EggScript.newGridRange(extraDataSheet.properties.sheetId, 
    "D" + (EggScript.getDimensionLength(extraDataSheet, "D") + 1));
  EggScript.requestArrayUpdateCellsRequestPush(requestArray,
    EggScript.newUpdateCellsRequest(formSubmissionStackRows, formSubmissionStackFields, formSubmissionStackGridRange));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray);
}
// Similar to processFormSubmissionRevamp(), but for processFormUndo() instead
function processFormUndoRevamp() {
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  // Effectively ++gaffeCounter
  let gaffeCounter = extraDataSheet.data[0].getRowData() && 
    extraDataSheet.data[0].getRowData()[0].values[1].getUserEnteredValue() ? 
    extraDataSheet.data[0].getRowData()[0].values[1].getUserEnteredValue().numberValue + 1 : 1;
  let gaffeCounterRowData = EggScript.newRowData();
  EggScript.validArrayPush(gaffeCounterRowData.values, EggScript.newCellData(gaffeCounter));
  let gaffeCounterRows = [gaffeCounterRowData];
  let gaffeCounterFields = "userEnteredValue";
  let gaffeCounterGridRange = EggScript.newGridRange(extraDataSheet.properties.sheetId, "B1");
  EggScript.requestArrayUpdateCellsRequestPush(requestArray, 
    EggScript.newUpdateCellsRequest(gaffeCounterRows, gaffeCounterFields, gaffeCounterGridRange));
  // Pop an entry from formSubmissionStack
  let formSubmissionStackLength = EggScript.getDimensionLength(extraDataSheet, "D");
  EggScript.requestArrayUpdateCellsRequestPush(requestArray, 
    EggScript.newClearCellUpdateCellsRequest(extraDataSheet, "D" + formSubmissionStackLength));
  // Clear the last row of the relevant sheet
  let formSubmissionStackLastFormTitle = 
    extraDataSheet.data[0].getRowData()[formSubmissionStackLength - 1].values[3].getUserEnteredValue().stringValue;
  let formSubmissionStackLastFormSheet = EggScript.getSheetFromTitle(spreadsheet, formSubmissionStackLastFormTitle);
  EggScript.requestArrayUpdateCellsRequestPush(requestArray,
    EggScript.newClearDimensionUpdateCellsRequest(formSubmissionStackLastFormSheet, 
    EggScript.getDimensionLength(formSubmissionStackLastFormSheet, "A")));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray);
  return gaffeCounter;
}
// Revamp of resetSpreadsheet() using only one batchUpdate() call
function resetSpreadsheetRevamp() {
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  Array.from(spreadsheet.sheets).forEach(sheet => {
    switch (sheet.properties.title) {
      case "extra-data":
          EggScript.requestArrayUpdateCellsRequestPush(requestArray, 
            EggScript.newClearCellUpdateCellsRequest(sheet, "B1"));
          EggScript.requestArrayUpdateCellsRequestPush(requestArray,
            EggScript.newClearDimensionUpdateCellsRequest(sheet, "D"));
        break;
      case "stock-price":
        let index;
        for (index = 0; index < EggScript.getDimensionLength(sheet, "A"); ++index) {
          EggScript.requestArrayUpdateCellsRequestPush(requestArray, 
            EggScript.newClearDimensionUpdateCellsRequest(sheet, index + 1));
        }
        break;
      case "test-zone":
        // Todo: come up with something to do here
        break;
      default:
        // Remove all form data sheets
        let deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        requestArray.push(Sheets.newRequest());
        requestArray[requestArray.length - 1].deleteSheet = deleteSheetRequest;
        break;
    }
  });
  EggScript.batchUpdate(requestArray);
}
// Do the thing
function testOtherFunctions(){
  // Base ValueRange to test against
  let baseValueRange = Sheets.newValueRange();
  baseValueRange.range = "test-zone!A1:B2";
  baseValueRange.majorDimension = "ROWS";
  baseValueRange.values = [[1, 2], [3, 4]];
  // Empty ValueRange to test edge cases
  let emptyValueRange = Sheets.newValueRange();
  emptyValueRange.range = "test-zone";
  emptyValueRange.majorDimension = "ROWS";
  emptyValueRange.values = [[]];
  // Test if formulas can be used in update
  if (0) {
    let formulaValueRange = Sheets.newValueRange();
    formulaValueRange.range = "extra-data!B1";
    formulaValueRange.majorDimension = "COLUMNS";
    formulaValueRange.values = [["=SUM(2, 3)"]];
    Sheets.Spreadsheets.Values.update(formulaValueRange, EggScript.spreadsheetId, 
      "extra-data!B1", {valueInputOption: "USER_ENTERED"});
  }
  // Test getting spreadsheet with specific data requested
  if (0) {
    let spreadsheet = Sheets.Spreadsheets.get(EggScript.spreadsheetId, {fields: EggScript.spreadsheetFieldMask});
    Logger.log(spreadsheet);
  }
  // Test functions which require sheet.properties
  if (0) {
    Array.from(EggScript.getSpreadsheet().sheets).forEach(sheet => {
      switch (sheet.properties.title) {
        case "extra-data":
          if (0)
            // Test newGridRange() with only one input
            Logger.log(EggScript.newGridRange(sheet.properties.sheetId, "A1"));
          break
        case "test-zone":
          if (0) {
            // Test with basic cells
            let rows = EggScript.valueRangeToRowDataArray(baseValueRange);
            let fields = "userEnteredValue";
            let range = EggScript.newGridRange(sheet.properties.sheetId, baseValueRange.range.split("!")[1]);
            Logger.log(EggScript.newUpdateCellsRequest(rows, fields, range));
          }
          if (0) {
            // Test with empty cells
            let rows = EggScript.valueRangeToRowDataArray(emptyValueRange);
            let fields = "userEnteredValue";
            let range = EggScript.newGridRange(sheet.properties.sheetId, emptyValueRange.range.split("!")[1]);
            Logger.log(EggScript.newUpdateCellsRequest(rows, fields, range));
          }
          break;
        default:
          break;
      }
    });
  }
  // Test valueRangeToRowDataArray()
  if (0) {
    Logger.log(EggScript.valueRangeToRowDataArray(baseValueRange));
  }
}
// Class with deprecated methods
class OldScript {
  // Convert a ValueRange to a RowData array
  // Note: this assumes that all values are user-entered, and that valueRange.values is not a ragged array
  // Also: this is deprecated now, only useful for legacy non-EggScript functions
  static valueRangeToRowDataArray(valueRange) {
    let rows = [];
    if (valueRange.majorDimension === "COLUMNS") {
      let rowsIndex;
      for (rowsIndex = 0; rowsIndex < valueRange.values[0].length; ++rowsIndex) {
        rows.push(EggScript.newRowData());
        let valueRangeMajorDimensionIndex;
        for (valueRangeMajorDimensionIndex = 0; valueRangeMajorDimensionIndex < valueRange.values.length; 
          ++valueRangeMajorDimensionIndex) {
          rows[rowsIndex].values[valueRangeMajorDimensionIndex] = 
            EggScript.newCellData(valueRange.values[valueRangeMajorDimensionIndex][rowsIndex]);
        }
      }
    } else {
      let valueRangeMajorDimensionIndex; // This is equivalent to rowsIndex above, when majorDimension === "COLUMNS"
      for (valueRangeMajorDimensionIndex = 0; valueRangeMajorDimensionIndex < valueRange.values.length; 
        ++valueRangeMajorDimensionIndex) {
        let rowData = EggScript.newRowData();
        Array.from(valueRange.values[valueRangeMajorDimensionIndex]).forEach(column => {
          rowData.values.push(EggScript.newCellData(column));
        });
        rows.push(rowData);
      }
    }
    return rows;
  }
  // Deletes all data from a range on the specified sheet
  // Note: this assumes that all values are user-entered, which should be fine for most cases
  static newClearRangeUpdateCellsRequest(sheet, range) {
    let gridRange = EggScript.newGridRange(sheet.properties.sheetId, range);
    let columnLength = gridRange.endRowIndex - gridRange.startRowIndex;
    let rowLength = gridRange.endColumnIndex - gridRange.startColumnIndex;
    let rows = [];
    let rowsIndex;
    for (rowsIndex = 0; rowsIndex < columnLength; ++rowsIndex) {
      let rowData = EggScript.newRowData();
      let rowDataIndex;
      for (rowDataIndex = 0; rowDataIndex < rowLength; ++rowDataIndex) {
        rowData.values.push(EggScript.newCellData(""));
      }
      rows.push(rowData);
    }
    let fields = "userEnteredValue";
    return EggScript.newUpdateCellsRequest(rows, fields, gridRange);
  }
}
