// Serve HTML
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}
// ID of the spreadsheet, taken from the URL
const spreadsheetId = "1vilj874rxEg-9XuwhHiq24PMvuWf2F7cpWMzO1M_YCw";
// FieldMask to filter sheets.data, among other things
const spreadsheetFieldMask = "spreadsheetId,properties,spreadsheetUrl," + 
"sheets.properties,sheets.charts,sheets.data.startRow,sheets.data.startColumn," + 
"sheets.data.rowData.values.userEnteredValue," + "sheets.data.rowData.values.effectiveValue," + 
"sheets.data.rowData.values.formattedValue";
// General functions for interacting with Sheets API
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
    cellData.userEnteredValue = EggScript.newExtendedValue(value);
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
        else if (value.toUpperCase() == "TRUE")
          extendedValue.boolValue = true;
        else if (value.toUpperCase() == "FALSE")
          extendedValue.boolValue = false;
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
  static clearDimensionRequest(sheet, dimension) {
    let dimensionLength = EggScript.getDimensionLength(sheet, dimension);
    let rows = [];
    if (EggScript.isColumn(dimension)) {
      // Case where the dimension is a column
      let index;
      for (index = 0; index < dimensionLength; ++index) {
        let rowData = EggScript.newRowData();
        rows.push(rowData);
      }
    } else {
      // Case where the dimension is a row
      rows.push(EggScript.newRowData());
    }
    let fields = "userEnteredValue";
    let gridRange = EggScript.newGridRange(sheet.properties.sheetId, `${dimension}:${dimension}`);
    return EggScript.newUpdateCellsRequest(rows, fields, gridRange);
  }
  // Same as above, but only for one cell
  static clearCellRequest(sheet, cell) {
    let rowData = EggScript.newRowData();
    let rows = [rowData];
    let fields = "userEnteredValue";
    let gridRange = EggScript.newGridRange(sheet.properties.sheetId, cell);
    return EggScript.newUpdateCellsRequest(rows, fields, gridRange);
  }
  // If the spreadsheet doesn't contain a sheet with the specified title, 
  // create a new AddSheetRequest and append the title to the top of the calculation sheets (via an UpdateCellsRequest)
  // Note: this returns a request array, instead of a single request like most of the other functions.
  // On top of that, it takes in the whole spreadsheet as a parameter instead of a single sheet
  static validateSheetRequestArray(spreadsheet, title) {
    let requestArray = [];
    if (!EggScript.getSheetFromTitle(spreadsheet, title)) {
      // Add a sheet with the specified title
      let addSheetRequest = Sheets.newAddSheetRequest();
      addSheetRequest.properties = Sheets.newSheetProperties();
      addSheetRequest.properties.title = title;
      EggScript.requestArrayPush(requestArray, "addSheet", addSheetRequest);
      // Make adjustments to each of the calculation sheets
      let calculationTitleArray = ["stock-price-initial", "stock-loss", "average-stock-loss", "stock-loss-weight", 
        "weighted-average-stock-loss", "win-lose-formula", "stock-price-delta", "stock-price"];
      calculationTitleArray.forEach(calculationTitle => {
        let sheet = EggScript.getSheetFromTitle(spreadsheet, calculationTitle);
        // Append the title
        let sheetColumnTitleListRowData = sheet.data[0].getRowData() && sheet.data[0].getRowData()[0] ? 
          sheet.data[0].getRowData()[0] : EggScript.newRowData();
        sheetColumnTitleListRowData.values.push(EggScript.newCellData(title));
        let rows = [sheetColumnTitleListRowData];
        let fields = "userEnteredValue";
        let gridRange;
        // Assign a random value as the initial stock price
        if(calculationTitle == "stock-price-initial") {
          let sheetColumnPriceListRowData = 
            sheet.data[0].getRowData() && sheet.data[0].getRowData()[1] ? 
            sheet.data[0].getRowData()[1] : EggScript.newRowData();
          sheetColumnPriceListRowData.values.push(EggScript.newCellData("=TRUNC((" + Math.random() + 
            "*('extra-data'!B4-'extra-data'!B5))+'extra-data'!B5,'extra-data'!B6)"));
          rows.push(sheetColumnPriceListRowData);
          gridRange = EggScript.newGridRange(sheet.properties.sheetId, "1:2");
        } else {
          gridRange = EggScript.newGridRange(sheet.properties.sheetId, "1:1");
        }
        EggScript.requestArrayPush(requestArray, "updateCells", 
          EggScript.newUpdateCellsRequest(rows, fields, gridRange));
      });
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
  // Taken directly from:
  // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
  static isEmpty(obj) {
    return Object.keys(obj).length === 0;
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
    if (request) {
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
        case "updateChartSpec":
          requestArray[requestArray.length - 1].updateChartSpec = request;
          break;
        default:
          // Prevent empty request
          requestArray.pop();
          break;
      }
    }
  }
  // Wrapper for creating an UpdateCellsRequest based on a calculated value
  static calculationRequest(calculation, sheet, cell) {
    let rowData = EggScript.newRowData();
    rowData.values.push(EggScript.newCellData(calculation));
    let rows = [rowData];
    let fields = "userEnteredValue";
    let gridRange = EggScript.newGridRange(sheet.properties.sheetId, cell);
    return EggScript.newUpdateCellsRequest(rows, fields, gridRange);
  }
  // Macro for converting some strings to an A1 cell reference
  static indirectConcatenate(sheet, column, row) {
    return `INDIRECT(CONCATENATE("${sheet}","!","${column}",${row}))`;
  }
  // Adds formulas to relevant cells in the calculation sheets
  // Used to be linked to constantCalculationRequestArray(), which is now deprecated
  static formulaCalculationRequestArray(spreadsheet, formSheetTitle) {
    let requestArray = [];
    let formSheet = EggScript.getSheetFromTitle(spreadsheet, formSheetTitle);
    // Ending row on formSheet, not on the calculation sheets, this is an important distinction
    let dataRowEnd = formSheet.data[0].getRowData() ? formSheet.data[0].getRowData().length : 1;
    // Same idea as above but applied to the starting row
    let dataRowStart = `IF(GTE(${dataRowEnd},'extra-data'!B1),1+${dataRowEnd}-'extra-data'!B1,1)`;
    // sl = stock loss
    let slSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-loss");
    // Assume below that column indices, lengths, etc are constant, since all the data 
    // is being entered at the same time per row and calculationSheet columns 
    // should have the same index on every calculation sheet after being added by
    // validateSheetRequestArray() earlier in processFormSubmission()
    let userEnteredValueArray = [];
    Array.from(slSheet.data[0].getRowData()[0].values).forEach(value => {
      userEnteredValueArray.push(value.getUserEnteredValue().stringValue);
    });
    let calculationColumnIndex = userEnteredValueArray.indexOf(formSheetTitle);
    let calculationColumn = EggScript.fromDimensionIndex(calculationColumnIndex, "COLUMNS");
    let calculationColumnNewDataRow = EggScript.getDimensionLength(slSheet, calculationColumn) + 1;
    let calculationCell = calculationColumn + calculationColumnNewDataRow;
    // +1 above and below to skip title for calculation sheets
    let calculationRowEnd = dataRowEnd + "+1";
    let calculationRowStart = dataRowStart + "+1";
    let slFormula = "=" + EggScript.indirectConcatenate(formSheetTitle, "B", dataRowEnd) + "-" + 
      EggScript.indirectConcatenate(formSheetTitle, "C", dataRowEnd);
    let slRequest = EggScript.calculationRequest(slFormula, slSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", slRequest);
    // asl = average stock loss
    let aslSheet = EggScript.getSheetFromTitle(spreadsheet, "average-stock-loss");
    let aslFormula = "=AVERAGE(" + 
      EggScript.indirectConcatenate("stock-loss", calculationColumn, calculationRowStart) + ":" + 
      EggScript.indirectConcatenate("stock-loss", calculationColumn, calculationRowEnd) + ")";
    let aslRequest = EggScript.calculationRequest(aslFormula, aslSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", aslRequest);
    // slw = stock loss weight
    let slwSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-loss-weight");
    // Assigns a weight of one instead in the case where it would otherwise be zero
    // Probably not the mathematically correct way to do this, will maybe fix it later
    let slwFormula = "=IFERROR(IF(GT(VALUE(" + EggScript.indirectConcatenate(formSheetTitle, "B", dataRowEnd) + 
      "),0)," + EggScript.indirectConcatenate("stock-loss", calculationColumn, calculationRowEnd) + "/" + 
      EggScript.indirectConcatenate(formSheetTitle, "B", dataRowEnd) + ",0),1)";
    let slwRequest = EggScript.calculationRequest(slwFormula, slwSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", slwRequest);
    // wasl = weighted average stock loss
    let waslSheet = EggScript.getSheetFromTitle(spreadsheet, "weighted-average-stock-loss");
    // What actually happens when both the averages and the weights are zero? Should this be fixed?
    // Right now it simply returns the average of the last inclusionRange data points in average-stock-loss,
    // but this probably isn't correct because it assumes that all the weights are one 
    // instead of zero. Although this theoretically shouldn't happen due to the hack in slwFormula above
    let waslFormula = "=IFERROR(AVERAGE.WEIGHTED(" + 
      EggScript.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowStart) + ":" + 
      EggScript.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowEnd) + "," + 
      EggScript.indirectConcatenate("stock-loss-weight", calculationColumn, calculationRowStart) + ":" + 
      EggScript.indirectConcatenate("stock-loss-weight", calculationColumn, calculationRowEnd) + "),AVERAGE(" + 
      EggScript.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowStart) + ":" + 
      EggScript.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowEnd) + "))";
    let waslRequest = EggScript.calculationRequest(waslFormula, waslSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", waslRequest);
    // wlf = win-lose formula
    let wlfSheet = EggScript.getSheetFromTitle(spreadsheet, "win-lose-formula");
    let wlfFormula = "=IF(GTE(" + dataRowEnd + ",'extra-data'!B1),POWER('extra-data'!B2," + 
      "COUNTIF(" + EggScript.indirectConcatenate(formSheetTitle, "A", dataRowStart) + ":" + 
      EggScript.indirectConcatenate(formSheetTitle, "A", dataRowEnd) + ",TRUE))-POWER('extra-data'!B3," + 
      "COUNTIF(" + EggScript.indirectConcatenate(formSheetTitle, "A", dataRowStart) + ":" + 
      EggScript.indirectConcatenate(formSheetTitle, "A", dataRowEnd) + ",FALSE))," + 
      EggScript.indirectConcatenate("stock-price-initial", calculationColumn, "2") + ")";
    let wlfRequest = EggScript.calculationRequest(wlfFormula, wlfSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", wlfRequest);
    // spd = stock price delta
    let spdSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-price-delta");
    // No change in stock price on the off chance that the weighted average fails to compute
    let spdFormula = "=IFERROR(IF(GTE(" + dataRowEnd + ",'extra-data'!B1)," + 
      EggScript.indirectConcatenate("win-loss-formula", calculationColumn, calculationRowEnd) + "/" +
      EggScript.indirectConcatenate("weighted-average-stock-loss", calculationColumn, calculationRowEnd) + ",0),0)";
    let spdRequest = EggScript.calculationRequest(spdFormula, spdSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", spdRequest);
    // sp = stock price
    let spSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-price");
    let spFormula = "=TRUNC(IF(GTE(" + dataRowEnd + ",'extra-data'!B1)," + 
      EggScript.indirectConcatenate("stock-price", calculationColumn, calculationRowEnd) + "+" + 
      EggScript.indirectConcatenate("stock-price-delta", calculationColumn, calculationRowEnd) + "," + 
      EggScript.indirectConcatenate("stock-price-initial", calculationColumn, "2") + "),'extra-data'!B6)";
    let spRequest = EggScript.calculationRequest(spFormula, spSheet, calculationCell);
    EggScript.requestArrayPush(requestArray, "updateCells", spRequest);
    return requestArray;
  }
  // Essentially, pop an entry from each of the calculation sheets
  // Some of this is similar to formulaCalculationRequestArray() but in reverse, see above for some documentation
  static undoCalculationRequestArray(spreadsheet, formSheetTitle) {
    let requestArray = [];
    // sl = stock loss; only used to get some constants
    let slSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-loss");
    let userEnteredValueArray = [];
    Array.from(slSheet.data[0].getRowData()[0].values).forEach(value => {
      userEnteredValueArray.push(value.getUserEnteredValue().stringValue);
    });
    let calculationColumnIndex = userEnteredValueArray.indexOf(formSheetTitle);
    let calculationColumn = EggScript.fromDimensionIndex(calculationColumnIndex, "COLUMNS");
    // Whole column length this time, so no -1 at the end
    let calculationColumnLength = EggScript.getDimensionLength(slSheet, calculationColumn);
    // Cut and paste from validateSheetRequestArray(), should probably be a global constant though
    let calculationTitleArray = ["stock-price-initial", "stock-loss", "average-stock-loss", "stock-loss-weight", 
      "weighted-average-stock-loss", "win-lose-formula", "stock-price-delta", "stock-price"];
    calculationTitleArray.forEach(sheetTitle => {
      if (sheetTitle != "stock-price-initial") {
        EggScript.requestArrayPush(requestArray, "updateCells", EggScript.clearCellRequest(
          EggScript.getSheetFromTitle(spreadsheet, sheetTitle), calculationColumn + calculationColumnLength));
      }
    });
    return requestArray;
  }
  // Clone of getSheetFromTitle(), but for charts
  static getChartFromTitle(sheet, title) {
    let titleArray = [];
    Array.from(sheet.charts).forEach(chart => {
      titleArray.push(chart.spec.title);
    });
    if (titleArray.includes(title))
      return sheet.charts[titleArray.indexOf(title)];
    else 
      return null;
  }
  // Add a series to stock-price-chart representing the new column in stock-price
  static updateStockPriceChartRequest(spreadsheet) {
    let stockPriceSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-price");
    let stockPriceChartSheet = EggScript.getSheetFromTitle(spreadsheet, "stock-price-chart");
    let stockPriceChart = EggScript.getChartFromTitle(stockPriceChartSheet, "stock-price-chart");
    if (!stockPriceChart.spec.basicChart.series)
      stockPriceChart.spec.basicChart.series = [];
    if (EggScript.getDimensionLength(stockPriceSheet, 1) > stockPriceChart.spec.basicChart.series.length) {
      let updateChartSpecRequest = Sheets.newUpdateChartSpecRequest();
      updateChartSpecRequest.chartId = stockPriceChart.chartId;
      updateChartSpecRequest.spec = stockPriceChart.spec;
      let basicChartSeries = Sheets.newBasicChartSeries();
      basicChartSeries.series = Sheets.newChartData();
      basicChartSeries.series.sourceRange = Sheets.newChartSourceRange();
      let stockPriceRangeColumn = 
        EggScript.fromDimensionIndex(EggScript.getDimensionLength(stockPriceSheet, 1) - 1, "COLUMNS");
      let stockPriceRange = `${stockPriceRangeColumn}:${stockPriceRangeColumn}`;
      basicChartSeries.series.sourceRange.sources = 
        EggScript.newGridRange(stockPriceSheet.properties.sheetId, stockPriceRange);
      basicChartSeries.targetAxis = "LEFT_AXIS";
      updateChartSpecRequest.spec.basicChart.series.push(basicChartSeries);
      return updateChartSpecRequest;
    } else {
      return null;
    }
  }
}
// Revamp of processFormSubmission() using only one get() call (usually) and one batchUpdate() call
function processFormSubmission(form) {
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
    "D" + (extraDataSheet.data[0].getRowData()[0].values[3].toString() === "{}" ? 1 : 
    EggScript.getDimensionLength(extraDataSheet, "D") + 1));
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.newUpdateCellsRequest(formSubmissionStackRows, formSubmissionStackFields, formSubmissionStackGridRange));
  // Update the calculation sheets
  // requestArrayPush() isn't used here because the formula calculations are already in requestArray format
  requestArray.push(EggScript.formulaCalculationRequestArray(spreadsheet, form["sheet-select"]));
  // Update the stock price chart
  EggScript.requestArrayPush(requestArray, "updateChartSpec", EggScript.updateStockPriceChartRequest(spreadsheet));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray);
}
// Similar to processFormSubmission() above, but for processFormUndo() instead
function processFormUndo() {
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  let extraDataSheet = EggScript.getSheetFromTitle(spreadsheet, "extra-data");
  // Effectively ++gaffeCounter
  let gaffeCounter = extraDataSheet.data[0].getRowData() && extraDataSheet.data[0].getRowData()[0].values[5] && 
    extraDataSheet.data[0].getRowData()[0].values[5].getUserEnteredValue() ? 
    extraDataSheet.data[0].getRowData()[0].values[5].getUserEnteredValue().numberValue + 1 : 1;
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
    extraDataSheet.data[0].getRowData()[formSubmissionStackLength - 1].values[3].getUserEnteredValue().stringValue;
  let formSubmissionStackLastFormSheet = EggScript.getSheetFromTitle(spreadsheet, formSubmissionStackLastFormTitle);
  EggScript.requestArrayPush(requestArray, "updateCells",
    EggScript.clearDimensionRequest(formSubmissionStackLastFormSheet, 
    EggScript.getDimensionLength(formSubmissionStackLastFormSheet, "A")));
  // Pop an entry from the relevant column in each of the calculation sheets
  requestArray.push(EggScript.undoCalculationRequestArray(spreadsheet, formSubmissionStackLastFormTitle));
  // Update the spreadsheet
  EggScript.batchUpdate(requestArray);
  return gaffeCounter;
}
// Redone version of resetSpreadsheet() using only two API calls
// Clears all but stock-price-chart and extra-data
function resetSpreadsheet() {
  let spreadsheet = EggScript.getSpreadsheet();
  let requestArray = [];
  Array.from(spreadsheet.sheets).forEach(sheet => {
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
        let index;
        for (index = 0; index < EggScript.getDimensionLength(sheet, "1"); ++index) {
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
  EggScript.batchUpdate(requestArray);
}
