// Serve HTML
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}
// ID of the spreadsheet, taken from the URL
const spreadsheetId = "1R3DYA_RTH9zjyvSdQLO6I7cVs5n4QQshHRaf8LDUFtA";
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
      EggScript.requestArrayPush(requestArray, "addSheet", addSheetRequest);
      let stockPriceSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-price");
      let stockPriceColumnListRowData = 
        stockPriceSheet.data[0].getRowData() && stockPriceSheet.data[0].getRowData()[0] ? 
        stockPriceSheet.data[0].getRowData()[0] : EggScript.newRowData();
      stockPriceColumnListRowData.values.push(EggScript.newCellData(title));
      let rows = [stockPriceColumnListRowData];
      let fields = "userEnteredValue";
      let gridRange = EggScript.newGridRange(stockPriceSheet.properties.sheetId, "1:1");
      EggScript.requestArrayPush(requestArray, "updateCells", 
        EggScript.newUpdateCellsRequest(rows, fields, gridRange));
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
  // Wrapper for pushing a new request to a requestArray
  static requestArrayPush(requestArray, kind, request) {
    requestArray.push(Sheets.newRequest());
    switch (kind) {
      case "updateCells":
        requestArray[requestArray.length - 1].updateCells = request;
        break;
      case "addSheet":
        requestArray[requestArray.length - 1].addSheet = request;
        break;
      case "deleteSheet":
        requestArray[requestArray.length - 1].deleteSheet = request;
        break;
      default:
        // Prevent empty request
        requestArray.pop();
        break;
    }
  }
  // Taken directly from:
  // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
  static isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }
}
// Revamp of processFormSubmission() using only one get() call (usually) and one batchUpdate() call
function processFormSubmission(form) {
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
  formSubmissionRowData.values.push(winLoseCellData, stockCountStartCellData, stockCountEndCellData);
  let formSubmissionRows = [formSubmissionRowData];
  let formSubmissionFields = "userEnteredValue";
  let formSheetNewEntryRowNumber = EggScript.getDimensionLength(formSubmissionSheet, "A") + 1;
  let formSubmissionGridRange = EggScript.newGridRange(formSubmissionSheet.properties.sheetId, 
    "A" + formSheetNewEntryRowNumber + ":C" + formSheetNewEntryRowNumber);
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(formSubmissionRows, formSubmissionFields, formSubmissionGridRange));
  // Push an entry to formSubmissionStack
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  let formSubmissionStackRowData = EggScript.newRowData();
  formSubmissionStackRowData.values.push(EggScript.newCellData(form["sheet-select"]));
  let formSubmissionStackRows = [formSubmissionStackRowData];
  let formSubmissionStackFields = "userEnteredValue";
  let formSubmissionStackGridRange = EggScript.newGridRange(extraDataSheet.properties.sheetId, 
    "D" + (EggScript.getDimensionLength(extraDataSheet, "D") + 1));
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(formSubmissionStackRows, formSubmissionStackFields, formSubmissionStackGridRange));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray);
}
// Similar to processFormSubmission() above, but for processFormUndo() instead
function processFormUndo() {
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  // Effectively ++gaffeCounter
  let gaffeCounter = extraDataSheet.data[0].getRowData() && 
    extraDataSheet.data[0].getRowData()[0].values[1].getUserEnteredValue() ? 
    extraDataSheet.data[0].getRowData()[0].values[1].getUserEnteredValue().numberValue + 1 : 1;
  let gaffeCounterRowData = EggScript.newRowData();
  gaffeCounterRowData.values.push(EggScript.newCellData(gaffeCounter));
  let gaffeCounterRows = [gaffeCounterRowData];
  let gaffeCounterFields = "userEnteredValue";
  let gaffeCounterGridRange = EggScript.newGridRange(extraDataSheet.properties.sheetId, "B1");
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(gaffeCounterRows, gaffeCounterFields, gaffeCounterGridRange));
  // Pop an entry from formSubmissionStack
  let formSubmissionStackLength = EggScript.getDimensionLength(extraDataSheet, "D");
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newClearCellUpdateCellsRequest(extraDataSheet, "D" + formSubmissionStackLength));
  // Clear the last row of the relevant sheet
  let formSubmissionStackLastFormTitle = 
    extraDataSheet.data[0].getRowData()[formSubmissionStackLength - 1].values[3].getUserEnteredValue().stringValue;
  let formSubmissionStackLastFormSheet = EggScript.getSheetFromTitle(spreadsheet, formSubmissionStackLastFormTitle);
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newClearDimensionUpdateCellsRequest(formSubmissionStackLastFormSheet, 
    EggScript.getDimensionLength(formSubmissionStackLastFormSheet, "A")));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray);
  return gaffeCounter;
}
// Redone version of resetSpreadsheet() using only two API calls
function resetSpreadsheet() {
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  Array.from(spreadsheet.sheets).forEach(sheet => {
    switch (sheet.properties.title) {
      case "extra-data":
          EggScript.requestArrayPush(requestArray, "updateCells",
            EggScript.newClearCellUpdateCellsRequest(sheet, "B1"));
          EggScript.requestArrayPush(requestArray, "updateCells",
            EggScript.newClearDimensionUpdateCellsRequest(sheet, "D"));
        break;
      case "stock-price":
        let index;
        for (index = 0; index < EggScript.getDimensionLength(sheet, "A"); ++index) {
          EggScript.requestArrayPush(requestArray, "updateCells",
            EggScript.newClearDimensionUpdateCellsRequest(sheet, index + 1));
        }
        break;
      default:
        // Remove all form data sheets
        let deleteSheetRequest = Sheets.newDeleteSheetRequest();
        deleteSheetRequest.sheetId = sheet.properties.sheetId;
        EggScript.requestArrayPush(requestArray, "deleteSheet", deleteSheetRequest);
        break;
    }
  });
  EggScript.batchUpdate(requestArray);
}
