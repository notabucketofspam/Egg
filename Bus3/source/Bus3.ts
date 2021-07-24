/**
 * Batch Update SpreadSheet Script
 */
namespace Bus3 {
  /**
   * FieldMask to filter sheets.data, among other things; retrieves both cell data and chart data.
   * @returns {string} FieldMask used in Bus3.getSpreadsheet()
   */
  export const defaultSpreadsheetFieldMask = "spreadsheetId,properties,spreadsheetUrl," +
    "sheets.properties,sheets.charts,sheets.data.startRow,sheets.data.startColumn," +
    "sheets.data.rowData.values.userEnteredValue,sheets.data.rowData.values.effectiveValue," +
    "sheets.data.rowData.values.formattedValue";
  /**
   * Wrapper for Sheets.Spreadsheets.get().
   * Uses Bus3.spreadsheetFieldMask if the fields parameter is undefined.
   * @param {string} spreadsheetId Take from the URL of the Google Sheets spreadsheet
   * @param {string} [fields=Bus3.spreadsheetFieldMask] Defaults to getting cell data and chart data
   * @returns {GoogleAppsScript.Sheets.Schema.Spreadsheet} The spreadsheet object
   */
  export function getSpreadsheet(spreadsheetId: string, fields = Bus3.defaultSpreadsheetFieldMask) {
    return Sheets.Spreadsheets.get(spreadsheetId, { fields: fields });
  }
  /**
   * Check if a dimension is a column.
   * Saves the headache of trying to remember what Number.blah means.
   * @param {any} dimension Either row (number) or column (string)
   * @returns {boolean} Whether or not the dimension is a column (self-explanatory)
   */
  export function isColumn(dimension: any) {
    return Number.isNaN(Number.parseInt(dimension));
  }
  /**
   * Convert a row or column to its respective zero-based index.
   * Accounts for multi-letter columns.
   * @param {any} dimension Either row (number) or column (string), in A1 notation
   * @returns {number} Dimension index, starting from the top-left of the sheet
   */
  export function toDimensionIndex(dimension: any) {
    // Partially taken from:
    // https://stackoverflow.com/questions/21229180/convert-column-index-into-corresponding-column-letter
    let dimensionIndex = 0;
    if (Bus3.isColumn(dimension)) {
      for (let charCodeAtIndex = 0; charCodeAtIndex < dimension.length; ++charCodeAtIndex) {
        dimensionIndex += (dimension.charCodeAt(charCodeAtIndex) - 64) *
          Math.pow(26, dimension.length - charCodeAtIndex - 1);
      }
    } else {
      dimensionIndex = Math.trunc(dimension);
    }
    --dimensionIndex;
    return dimensionIndex;
  }
  /**
   * Basically Bus3.toDimensionIndex(), but in reverse.
   * Also accounts for multi-character columns.
   * @param {number} dimensionIndex Zero-based index of a row / column
   * @param {string} majorDimension Can be one of: COLUMNS, ROWS
   * @returns {string} A1 notation of row / column dimension
   */
  export function fromDimensionIndex(dimensionIndex: number, majorDimension: string) {
    // Taken from the same source as Bus3.toDimensionIndex()
    ++dimensionIndex;
    let dimension = "";
    if (majorDimension === "COLUMNS") {
      let currentCharCode: number;
      while (dimensionIndex > 0) {
        currentCharCode = (dimensionIndex - 1) % 26;
        dimension = String.fromCharCode(currentCharCode + 65) + dimension;
        dimensionIndex = (dimensionIndex - currentCharCode - 1) / 26;
      }
    } else {
      dimension = String(dimensionIndex);
    }
    return dimension;
  }
  /**
   * Wrapper for Sheets.newGridRange(), using a sheetId and a range (A1 notation).
   * At present, it does not check against bad range inputs, so please don't mess it up.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet Use Bus3.getSheetFromTitle()
   * @param {string} range Range of cells, in A1 notation
   * @returns {GoogleAppsScript.Sheets.Schema.GridRange} New Sheets GridRange object
   */
  export function newGridRange(sheet: GoogleAppsScript.Sheets.Schema.Sheet, range: string) {
    const gridRange = Sheets.newGridRange();
    gridRange.sheetId = sheet.properties.sheetId;
    // Make sure that the range exists
    if (range) {
      // Don't need to check if first half of the range exists, 
      // since if it didn't then range would be invalid anyways
      const rangeStart = range.split(":")[0];
      const rangeStartStringRowIndex = rangeStart.search(/[0-9]/);
      const rangeStartStringColumnIndex = rangeStart.search(/[A-Z]/);
      let startRowIndex: string;
      let startColumnIndex: string;
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
        gridRange.startRowIndex = Bus3.toDimensionIndex(startRowIndex);
      if (startColumnIndex)
        gridRange.startColumnIndex = Bus3.toDimensionIndex(startColumnIndex);
      // Set the second half of the range, if it exists
      const rangeEnd = range.split(":")[1];
      if (rangeEnd) {
        const rangeEndStringRowIndex = rangeEnd.search(/[0-9]/);
        const rangeEndStringColumnIndex = rangeEnd.search(/[A-Z]/);
        let endRowIndex: string;
        let endColumnIndex: string;
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
          gridRange.endRowIndex = Bus3.toDimensionIndex(endRowIndex) + 1;
        if (endColumnIndex)
          gridRange.endColumnIndex = Bus3.toDimensionIndex(endColumnIndex) + 1;
      } else {
        // Case where no end of range is provided (usually when a single cell is selected)
        gridRange.endRowIndex = gridRange.startRowIndex + 1;
        gridRange.endColumnIndex = gridRange.startColumnIndex + 1;
      }
    }
    return gridRange;
  }
  /**
   * Wrapper for Sheets.newRowData().
   * Necessary since the native Sheets API appears to be broken in this regard.
   * @returns {{values: GoogleAppsScript.Sheets.Schema.CellData[]}} Stand-in for the official RowData
   */
  export function newRowData() {
    const values: GoogleAppsScript.Sheets.Schema.CellData[] = [];
    return { values };
  }
  /**
   * Wrapper for Sheets.newCellData().
   * As with basically everything else, this assumes that the value is user-entered.
   * @param {boolean | number | string} value Also accepts a Sheets formula as a string
   * @returns {GoogleAppsScript.Sheets.Schema.CellData} CellData object with relevant ExtendedValue inserted
   */
  export function newCellData(value: boolean | number | string) {
    const cellData = Sheets.newCellData();
    cellData.userEnteredValue = Bus3.newExtendedValue(value);
    return cellData;
  }
  /**
   * Wrapper for Sheets.newExtendedValue().
   * A string that starts with equals will be entered as a Sheets formula, i.e. =SUM(...).
   * @param {boolean | number | string} value Registers as user-entered most of the time
   * @returns {GoogleAppsScript.Sheets.Schema.ExtendedValue} A valid ExtendedValue object
   */
  export function newExtendedValue(value: boolean | number | string) {
    const extendedValue = Sheets.newExtendedValue();
    switch (typeof value) {
      case "number":
        extendedValue.numberValue = value;
        break;
      case "string":
        if (value.startsWith("="))
          extendedValue.formulaValue = value;
        else if (value.toUpperCase() === "TRUE")
          extendedValue.boolValue = true;
        else if (value.toUpperCase() === "FALSE")
          extendedValue.boolValue = false;
        else
          extendedValue.stringValue = value;
        break;
      case "boolean":
        extendedValue.boolValue = value;
        break;
      default:
        // This shouldn't be reachable due to the parameter type union above
        const errorValue = Sheets.newErrorValue();
        errorValue.type = "ERROR";
        errorValue.message = "Bad value: Bus3.newExtendedValue()";
        extendedValue.errorValue = errorValue;
        break;
    }
    return extendedValue;
  }
  /**
   * Wrapper for Sheets.newUpdateCellsRequest().
   * Most often used in conjunction with GoogleAppsScript.Sheets.Schema.Request[].
   * Note: this assumes the union field area to be range.
   * @param {GoogleAppsScript.Sheets.Schema.RowData[]} rows Array of cell row data
   * @param {string} fields Will usually use "userEnteredValue"
   * @param {GoogleAppsScript.Sheets.Schema.GridRange} range Will usually use Bus3.newGridRange()
   * @returns {GoogleAppsScript.Sheets.Schema.UpdateCellsRequest} Push this into a Request[]
   */
  export function newUpdateCellsRequest(rows: GoogleAppsScript.Sheets.Schema.RowData[], fields: string,
    range: GoogleAppsScript.Sheets.Schema.GridRange) {
    const updateCellsRequest = Sheets.newUpdateCellsRequest();
    updateCellsRequest.rows = rows;
    updateCellsRequest.fields = fields;
    updateCellsRequest.range = range;
    return updateCellsRequest;
  }
  /**
   * Size of specified row / column on the sheet.
   * Data does not need to be contiguous, however the dimension still needs to be valid.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet The sheet object
   * @param {any} dimension Either a row (number) or column (string)
   * @returns {number} Length of row or column
   */
  export function getDimensionLength(sheet: GoogleAppsScript.Sheets.Schema.Sheet, dimension: any) {
    let dimensionLength = 0;
    // Make sure that the sheet has data
    if (sheet.data[0].rowData) {
      if (Bus3.isColumn(dimension)) {
        // Case where the dimension is a column
        // rowData.length is guaranteed to be at least 1 because if it were 0 then data[0] would not contain rowData
        dimensionLength = sheet.data[0].rowData.length;
        do {
          if (!Bus3.isEmptyRange(sheet, `${dimension}${dimensionLength}`))
            break;
        } while (--dimensionLength);
      } else {
        // Case where the dimension is a row
        dimensionLength = sheet.data[0].rowData[Bus3.toDimensionIndex(dimension)].values.length;
      }
    }
    return dimensionLength;
  }
  /**
   * Deletes all data in a row or column on a specified sheet.
   * As with the rest of the UpdateCellsRequest functions, this assumes that all values are user-entered.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet Also get this from Bus3.getSheetFromTitle()
   * @param {any} dimension Either row (number) or column (string)
   * @returns {GoogleAppsScript.Sheets.Schema.UpdateCellsRequest} Push this into a Request[]
   */
  export function newClearDimensionRequest(sheet: GoogleAppsScript.Sheets.Schema.Sheet, dimension: any) {
    const rows: GoogleAppsScript.Sheets.Schema.RowData[] = [];
    if (Bus3.isColumn(dimension)) {
      // Case where the dimension is a column
      for (let index = 0; index < sheet.properties.gridProperties.rowCount; ++index) {
        const rowData = Bus3.newRowData();
        rows.push(rowData);
      }
    } else {
      // Case where the dimension is a row
      rows.push(Bus3.newRowData());
    }
    const fields = "userEnteredValue";
    const gridRange = Bus3.newGridRange(sheet, `${dimension}:${dimension}`);
    return Bus3.newUpdateCellsRequest(rows, fields, gridRange);
  }
  /**
   * Same as Bus3.clearDimensionRequest(), but only for one cell.
   * The cell parameter must be in A1 notation, i.e. a string.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet Get this from Bus3.getSheetFromTitle()
   * @param {string} cell Cell in A1 notation
   * @returns {GoogleAppsScript.Sheets.Schema.UpdateCellsRequest} Also push into a Request[]
   */
  export function newClearCellRequest(sheet: GoogleAppsScript.Sheets.Schema.Sheet, cell: string) {
    const rowData = Bus3.newRowData();
    const rows = [rowData];
    const fields = "userEnteredValue";
    const gridRange = Bus3.newGridRange(sheet, cell);
    return Bus3.newUpdateCellsRequest(rows, fields, gridRange);
  }
  /**
   * Wrapper for Sheets.Spreadsheets.batchUpdate().
   * This function makes sure that the array isn't empty first.
   * @param {GoogleAppsScript.Sheets.Schema.Request[]} requestArray Cannot contain nested Request[] objects
   * @param {string} spreadsheetId Get from spreadsheet URL or elsewhere
   */
  export function batchUpdate(requestArray: GoogleAppsScript.Sheets.Schema.Request[], spreadsheetId: string) {
    if (requestArray.length) {
      const batchUpdateSpreadsheetRequest = Sheets.newBatchUpdateSpreadsheetRequest();
      batchUpdateSpreadsheetRequest.requests = requestArray;
      Sheets.Spreadsheets.batchUpdate(batchUpdateSpreadsheetRequest, spreadsheetId);
    }
  }
  /**
   * Checks an object to see if it is empty.
   * Used for debugging, i.e. on sketchy blank cells.
   * @param {object} obj An object
   * @returns {boolean} Whether or not the object is empty
   */
  export function isEmptyObject(obj: object) {
    // Taken directly from:
    // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
    return Object.keys(obj).length === 0;
  }
  /**
   * Check to see if a range is full of only empty cells.
   * Returns false if at least one cell in the specified range contains a value.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet The sheet object
   * @param {string} range A1 notation range reference
   * @returns {boolean} Whether or not the range contains nothing in it
   */
  export function isEmptyRange(sheet: GoogleAppsScript.Sheets.Schema.Sheet, range: string) {
    const gridRange = Bus3.newGridRange(sheet, range);
    for (let rowDataIndex = gridRange.startRowIndex; rowDataIndex < gridRange.endRowIndex; ++rowDataIndex) {
      for (let valuesIndex = gridRange.startColumnIndex; valuesIndex < gridRange.endColumnIndex; ++valuesIndex) {
        if (sheet.data[0].rowData && sheet.data[0].rowData[rowDataIndex] &&
          sheet.data[0].rowData[rowDataIndex].values && sheet.data[0].rowData[rowDataIndex].values[valuesIndex] &&
          sheet.data[0].rowData[rowDataIndex].values[valuesIndex].toString() !== "{}") {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Does exactly what it says on the tin.
   * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet Retrieve from Bus3.getSpreadsheet()
   * @param {string} title Allowed to contain spaces (probably)
   * @returns {GoogleAppsScript.Sheets.Schema.Sheet} Sheet object, or undefined if not found
   */
  export function getSheetFromTitle(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet, title: string) {
    const titleArray = spreadsheet.sheets.map(sheet => sheet.properties.title);
    return spreadsheet.sheets[titleArray.indexOf(title)];
  }
  /**
   * Wrapper for pushing a new request to a Request[]; always use this instead of Array.prototype.push().
   * Can use Array.prototype.push.apply(requestArray, otherRequestArray) to consolidate Request objects.
   * Note: this doesn't sanitize inputs, so please don't enter a non-property of Request.
   * @param {GoogleAppsScript.Sheets.Schema.Request[]} requestArray Must exclusively contain Request objects
   * @param {string} kind One of the properties of Request, i.e. updateCells, updateChartSpec, addSheet, etc.
   * @param {any} request Will always be a GoogleAppsScript.Sheets.Schema.WhateverRequest object
   */
  export function requestArrayPush(requestArray: GoogleAppsScript.Sheets.Schema.Request[], kind: string,
    request: any) {
    if (request) {
      requestArray.push(Sheets.newRequest());
      requestArray[requestArray.length - 1][kind] = request;
    }
  }
  /**
   * Wrapper for creating an UpdateCellsRequest based on a single value.
   * The cell parameter must be in A1 notation, i.e. a string.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet Get from Bus3.getSheetFromTitle()
   * @param {string} value Basically anything
   * @param {string} cell In A1 notation
   * @returns {GoogleAppsScript.Sheets.Schema.UpdateCellsRequest} Shove it into a Request[]
   */
  export function newUpdateSingleCellRequest(sheet: GoogleAppsScript.Sheets.Schema.Sheet, value: string,
    cell: string) {
    const rowData = Bus3.newRowData();
    rowData.values.push(Bus3.newCellData(value));
    const rows = [rowData];
    const fields = "userEnteredValue";
    const gridRange = Bus3.newGridRange(sheet, cell);
    return Bus3.newUpdateCellsRequest(rows, fields, gridRange);
  }
  /**
   * Macro for converting some strings to an A1 cell reference
   * @param {string} sheetTitle Title of the sheet
   * @param {string} column Can stay a string as it is
   * @param {string} row Must be converted to a string using the String constructor, i.e. String(blah)
   * @returns {string} Ugly-looking reference to a Sheets A1 cell
   */
  export function indirectConcatenate(sheetTitle: string, column: string, row: string) {
    return `INDIRECT(CONCATENATE("${sheetTitle}","!","${column}",${row}))`;
  }
  /**
   * Clone of Bus3.getSheetFromTitle(), but for charts.
   * Note that it has a Sheet as the first parameter instead of a Spreadsheet.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet Get from Bus3.getSheetFromTitle()
   * @param {string} chartTitle Title of the chart to get
   * @returns {GoogleAppsScript.Sheets.Schema.EmbeddedChart} A chart, or undefined if not found
   */
  export function getChartFromTitle(sheet: GoogleAppsScript.Sheets.Schema.Sheet, chartTitle: string) {
    const chartTitleArray = sheet.charts.map(chart => chart.spec.title);
    return sheet.charts[chartTitleArray.indexOf(chartTitle)];
  }
  /**
   * Wrapper for Sheets.newUpdateChartSpecRequest().
   * Create a request to add a series representing a range of data to a basic chart.
   * @param {GoogleAppsScript.Sheets.Schema.EmbeddedChart} chart Use Bus3.getChartFromTitle()
   * @param {GoogleAppsScript.Sheets.Schema.GridRange} gridRange Use various means to construct
   * @returns {GoogleAppsScript.Sheets.Schema.UpdateChartSpecRequest} Push into Request[]
   */
  export function newUpdateChartSpecRequest(chart: GoogleAppsScript.Sheets.Schema.EmbeddedChart, 
    gridRange: GoogleAppsScript.Sheets.Schema.GridRange) {
    if (!chart.spec.basicChart.series)
      chart.spec.basicChart.series = [];
    const updateChartSpecRequest = Sheets.newUpdateChartSpecRequest();
    updateChartSpecRequest.chartId = chart.chartId;
    updateChartSpecRequest.spec = chart.spec;
    const basicChartSeries = Sheets.newBasicChartSeries();
    basicChartSeries.series = Sheets.newChartData();
    basicChartSeries.series.sourceRange = Sheets.newChartSourceRange();
    basicChartSeries.series.sourceRange.sources = [gridRange];
    basicChartSeries.targetAxis = "LEFT_AXIS";
    updateChartSpecRequest.spec.basicChart.series.push(basicChartSeries);
    return updateChartSpecRequest;
  }
  /**
   * Wrapper for Sheets.newAddChartRequest(); creates a sheet containing a basic chart.
   * Note that the chart is the only thing on the sheet; there are no data cells.
   * Use Bus3.newUpdateChartSpecRequest() to add a series to the chart.
   * Note: the spreadsheet will need to be reloaded (via Bus3.getSpreadsheet()) before data can be added.
   * @param {string} title The title of the new chart sheet
   * @param {string} chartType Can be one of: BAR, LINE, AREA, COLUMN, SCATTER, COMBO, STEPPED_AREA
   * @returns {GoogleAppsScript.Sheets.Schema.AddChartRequest} Shove it into Request[]
   */
  export function newAddChartSheetRequest(title: string, chartType: string) {
    const addChartRequest = Sheets.newAddChartRequest();
    addChartRequest.chart = Sheets.newEmbeddedChart();
    addChartRequest.chart.spec = Sheets.newChartSpec();
    addChartRequest.chart.spec.title = title;
    addChartRequest.chart.spec.maximized = true;
    addChartRequest.chart.spec.basicChart = Sheets.newBasicChartSpec();
    addChartRequest.chart.spec.basicChart.chartType = chartType;
    addChartRequest.chart.spec.basicChart.legendPosition = "BOTTOM_LEGEND";
    addChartRequest.chart.spec.basicChart.axis = [Sheets.newBasicChartAxis(), Sheets.newBasicChartAxis()];
    addChartRequest.chart.spec.basicChart.axis[0].position = "LEFT_AXIS";
    addChartRequest.chart.spec.basicChart.axis[1].position = "BOTTOM_AXIS";
    addChartRequest.chart.spec.basicChart.series = [];
    addChartRequest.chart.spec.basicChart.headerCount = 1;
    addChartRequest.chart.spec.basicChart.interpolateNulls = true;
    addChartRequest.chart.spec.basicChart.lineSmoothing = true;
    addChartRequest.chart.position = Sheets.newEmbeddedObjectPosition();
    addChartRequest.chart.position.newSheet = true;
    return addChartRequest;
  }
  /**
   * Wrapper for Sheets.newAddSheetRequest().
   * Note: the spreadsheet will need to be reloaded (via Bus3.getSpreadsheet()) before data can be added.
   * @param {string} title The title of the new sheet
   * @returns {GoogleAppsScript.Sheets.Schema.AddSheetRequest} Push it into Request[]
   */
  export function newAddSheetRequest(title: string) {
    const addSheetRequest = Sheets.newAddSheetRequest();
    addSheetRequest.properties = Sheets.newSheetProperties();
    addSheetRequest.properties.title = title;
    return addSheetRequest;
  }
  /**
   * Wrapper for Sheets.newAppendDimensionRequest().
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} sheet The sheet to add rows / columns to
   * @param {string} majorDimension Can be one of: COLUMNS, ROWS
   * @param {number} length How many rows / columns to add
   * @returns {GoogleAppsScript.Sheets.Schema.AppendDimensionRequest} Add rows / columns to the end of the sheet
   */
  export function newAppendDimensionRequest(sheet: GoogleAppsScript.Sheets.Schema.Sheet, majorDimension: string,
    length: number) {
    const appendDimensionRequest = Sheets.newAppendDimensionRequest();
    appendDimensionRequest.sheetId = sheet.properties.sheetId;
    appendDimensionRequest.dimension = majorDimension;
    appendDimensionRequest.length = length;
    return appendDimensionRequest;
  }
}
/**
 * Add the exported namespace functions to the global object.
 * Allows said functions to be accessed when Bus3 is used as a Google Apps Script library,
 * while still staying available for TypeScript IDE autocomplete.
 */
Object.keys(Bus3).forEach(function(prop) {
  Object.defineProperty(globalThis, prop, Object.getOwnPropertyDescriptor(Bus3, prop));
});
