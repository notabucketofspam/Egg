/**
 * Set of functions designed specifically for Egg.
 * Refer to Bus3 for general Google Sheets API.
 */
namespace EggScript {
  /**
   * List of sheets used for intermediate calculations.
   */
  export const calculationTitleArray =
    ["stock-price-initial", "stock-loss", "average-stock-loss", "stock-loss-weight",
      "weighted-average-stock-loss", "win-lose-formula", "stock-price-delta", "stock-price"];
  /**
   * If the spreadsheet doesn't contain a sheet with the specified title,
   * create a new AddSheetRequest and append the title to the top of the
   * calculation sheets (via an UpdateCellsRequest).
   * Note: this returns a request array, instead of a single request like most of the other functions.
   * On top of that, it takes in the whole spreadsheet as a parameter instead of a single sheet.
   * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
   * @param {string} formSheetTitle The character sheet to add
   * @returns {GoogleAppsScript.Sheets.Schema.Request[]} Some UpdateCellRequest objects and an AddSheetRequest
   */
  export function newValidateSheetRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
    formSheetTitle: string) {
    const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
    if (!Bus3.getSheetFromTitle(spreadsheet, formSheetTitle)) {
      // Add a sheet with the specified title
      const addSheetRequest = Sheets.newAddSheetRequest();
      addSheetRequest.properties = Sheets.newSheetProperties();
      addSheetRequest.properties.title = formSheetTitle;
      Bus3.requestArrayPush(requestArray, "addSheet", addSheetRequest);
      // Make adjustments to each of the calculation sheets
      EggScript.calculationTitleArray.forEach(function(calculationTitle) {
        const sheet = Bus3.getSheetFromTitle(spreadsheet, calculationTitle);
        // Append the title
        const sheetColumnTitleListRowData = sheet.data[0].rowData && sheet.data[0].rowData[0] ?
          sheet.data[0].rowData[0] : Bus3.newRowData();
        sheetColumnTitleListRowData.values.push(Bus3.newCellData(formSheetTitle));
        const rows = [sheetColumnTitleListRowData];
        const fields = "userEnteredValue";
        let gridRange: GoogleAppsScript.Sheets.Schema.GridRange;
        if (calculationTitle === "stock-price-initial") {
          // Assign a random value as the initial stock price
          const sheetColumnPriceListRowData = sheet.data[0].rowData && sheet.data[0].rowData[1] ?
            sheet.data[0].rowData[1] : Bus3.newRowData();
          sheetColumnPriceListRowData.values.push(Bus3.newCellData("=TRUNC((" + Math.random() +
            "*('extra-data'!B4-'extra-data'!B5))+'extra-data'!B5,'extra-data'!B6)"));
          rows.push(sheetColumnPriceListRowData);
          gridRange = Bus3.newGridRange(sheet, "1:2");
        } else {
          // Only append title and do nothing else
          gridRange = Bus3.newGridRange(sheet, "1:1");
        }
        // Add a column if need be
        if (sheetColumnTitleListRowData.values.length >= sheet.properties.gridProperties.columnCount)
          Bus3.requestArrayPush(requestArray, "appendDimension", Bus3.newAppendDimensionRequest(sheet, "COLUMNS", 1));
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newUpdateCellsRequest(rows, fields, gridRange));
      });
    }
    return requestArray;
  }
  /**
   * Does exactly what you would expect it to do.
   * Note: this returns a string (A1 row), not a number.
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} formSheet The character sheet
   * @returns {string} Ending row (A1) on formSheet
   */
  export function getLastEntryRowFromFormSheet(formSheet: GoogleAppsScript.Sheets.Schema.Sheet) {
    return String(formSheet.data[0].rowData ? formSheet.data[0].rowData.length + 1 : 1);
  }
  /**
   * Adds formulas to relevant cells in the calculation sheets.
   * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
   * @param {GoogleAppsScript.Sheets.Schema.Sheet} formSheet Sheet of the character selected on the web app form
   * @param {string} formEntryRowEnd Ending row (A1) on formSheet, not on the calculation sheets
   * @returns {GoogleAppsScript.Sheets.Schema.Request[]} A bunch of requests
   */
  export function newFormulaCalculationRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
    formSheet: GoogleAppsScript.Sheets.Schema.Sheet, formEntryRowEnd: string) {
    const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
    const formSheetTitle = formSheet.properties.title;
    // Ending row (A1) on formSheet, not on the calculation sheets, this is an important distinction
    //const formEntryRowEnd = String(formSheet.data[0].rowData ? formSheet.data[0].rowData.length + 1 : 1);
    // Same idea as formEntryRowEnd but applied to the starting row (A1)
    const formEntryRowStart = `IF(GTE(${formEntryRowEnd},'extra-data'!B1),1+${formEntryRowEnd}-'extra-data'!B1,1)`;
    // sl = stock loss
    const slSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-loss");
    // Since each calculation sheet should have the same number of rows after every update,
    // only one sheet needs to be checked to see if more rows need to be appended to all.
    // This has to come before any of the updateCellsRequest objects are added to requestArray;
    // order of operations is important apparently.
    if (slSheet.data[0].rowData.length >= slSheet.properties.gridProperties.rowCount) {
      EggScript.calculationTitleArray.forEach(function(calculationTitle) {
        Bus3.requestArrayPush(requestArray, "appendDimension", Bus3.newAppendDimensionRequest(
          Bus3.getSheetFromTitle(spreadsheet, calculationTitle), "ROWS", 1));
      });
    }
    // Assume below that column indices, lengths, etc are constant, since all the data
    // is being entered at the same time per row and calculation sheet columns 
    // should have the same index on every calculation sheet after being added by
    // newValidateSheetRequestArray() earlier in processFormSubmission()
    const userEnteredValueArray: string[] = [];
    slSheet.data[0].rowData[0].values.forEach(function(value) {
      userEnteredValueArray.push(value.userEnteredValue.stringValue);
    });
    const calculationColumnIndex = userEnteredValueArray.indexOf(formSheetTitle);
    const calculationColumn = Bus3.fromDimensionIndex(calculationColumnIndex, "COLUMNS");
    //const calculationColumnNewEntryRow = Bus3.getDimensionLength(slSheet, calculationColumn) + 1;
    // +1 below to skip title for calculation sheets
    const calculationColumnNewEntryRow = String(Number.parseInt(formEntryRowEnd) + 1);
    const calculationCell = calculationColumn + calculationColumnNewEntryRow;
    // Also +1 below to skip title
    const calculationRowEnd = formEntryRowEnd + "+1";
    const calculationRowStart = formEntryRowStart + "+1";
    const slFormula = "=" +
      Bus3.indirectConcatenate(formSheetTitle, "B", formEntryRowEnd) + "-" +
      Bus3.indirectConcatenate(formSheetTitle, "C", formEntryRowEnd);
    const slRequest = Bus3.newUpdateSingleCellRequest(slSheet, slFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", slRequest);
    // asl = average stock loss
    const aslSheet = Bus3.getSheetFromTitle(spreadsheet, "average-stock-loss");
    const aslFormula = "=AVERAGE(" +
      Bus3.indirectConcatenate("stock-loss", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("stock-loss", calculationColumn, calculationRowEnd) + ")";
    const aslRequest = Bus3.newUpdateSingleCellRequest(aslSheet, aslFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", aslRequest);
    // slw = stock loss weight
    const slwSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-loss-weight");
    // Assigns a weight of one instead in the case where it would otherwise be zero
    // Probably not the mathematically correct way to do this, will maybe fix it later
    const slwFormula = "=IFERROR(IF(GT(VALUE(" +
      Bus3.indirectConcatenate(formSheetTitle, "B", formEntryRowEnd) + "),0)," +
      Bus3.indirectConcatenate("stock-loss", calculationColumn, calculationRowEnd) + "/" +
      Bus3.indirectConcatenate(formSheetTitle, "B", formEntryRowEnd) + ",0),1)";
    const slwRequest = Bus3.newUpdateSingleCellRequest(slwSheet, slwFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", slwRequest);
    // wasl = weighted average stock loss
    const waslSheet = Bus3.getSheetFromTitle(spreadsheet, "weighted-average-stock-loss");
    // What actually happens when both the averages and the weights are zero? Should this be fixed?
    // Right now it simply returns the average of the last inclusionRange data points in average-stock-loss,
    // but this probably isn't correct because it assumes that all the weights are one 
    // instead of zero. Although this theoretically shouldn't happen due to the hack in slwFormula above
    const waslFormula = "=IFERROR(AVERAGE.WEIGHTED(" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowEnd) + "," +
      Bus3.indirectConcatenate("stock-loss-weight", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("stock-loss-weight", calculationColumn, calculationRowEnd) + "),AVERAGE(" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowEnd) + "))";
    const waslRequest = Bus3.newUpdateSingleCellRequest(waslSheet, waslFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", waslRequest);
    // wlf = win-lose formula
    const wlfSheet = Bus3.getSheetFromTitle(spreadsheet, "win-lose-formula");
    const wlfFormula = "=IF(GTE(" + formEntryRowEnd + ",'extra-data'!B1),POWER('extra-data'!B2,COUNTIF(" +
      Bus3.indirectConcatenate(formSheetTitle, "A", formEntryRowStart) + ":" +
      Bus3.indirectConcatenate(formSheetTitle, "A", formEntryRowEnd) + ",TRUE))-POWER('extra-data'!B3,COUNTIF(" +
      Bus3.indirectConcatenate(formSheetTitle, "A", formEntryRowStart) + ":" +
      Bus3.indirectConcatenate(formSheetTitle, "A", formEntryRowEnd) + ",FALSE))," +
      Bus3.indirectConcatenate("stock-price-initial", calculationColumn, "2") + ")";
    const wlfRequest = Bus3.newUpdateSingleCellRequest(wlfSheet, wlfFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", wlfRequest);
    // spd = stock price delta
    const spdSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price-delta");
    // No change in stock price on the off chance that the weighted average fails to compute
    const spdFormula = "=IFERROR(IF(GTE(" + formEntryRowEnd + ",'extra-data'!B1)," +
      Bus3.indirectConcatenate("win-lose-formula", calculationColumn, calculationRowEnd) + "/" +
      Bus3.indirectConcatenate("weighted-average-stock-loss", calculationColumn, calculationRowEnd) + ",0),0)";
    const spdRequest = Bus3.newUpdateSingleCellRequest(spdSheet, spdFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", spdRequest);
    // sp = stock price
    const spSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price");
    const spFormula = "=TRUNC(IF(LT(" + "IF(GTE(" + formEntryRowEnd + ",'extra-data'!B1), " +
      Bus3.indirectConcatenate("stock-price", calculationColumn, calculationRowEnd + "-1") + "+" +
      Bus3.indirectConcatenate("stock-price-delta", calculationColumn, calculationRowEnd) + "," +
      Bus3.indirectConcatenate("stock-price-initial", calculationColumn, "2") +
      "),'extra-data'!B7),'extra-data'!B7,IF(GTE(" + formEntryRowEnd + ",'extra-data'!B1)," +
      Bus3.indirectConcatenate("stock-price", calculationColumn, calculationRowEnd + "-1") + "+" +
      Bus3.indirectConcatenate("stock-price-delta", calculationColumn, calculationRowEnd) + "," +
      Bus3.indirectConcatenate("stock-price-initial", calculationColumn, "2") + ")),'extra-data'!B6)";
    const spRequest = Bus3.newUpdateSingleCellRequest(spSheet, spFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", spRequest);
    return requestArray;
  }
  /**
   * Essentially, pop an entry from each of the calculation sheets.
   * Some of this is similar to newFormulaCalculationRequestArray(), but in reverse.
   * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
   * @param {string} formSheetTitle Essentially, the character to undo the data input for
   * @returns {GoogleAppsScript.Sheets.Schema.Request[]} A bunch of UpdateCellsRequest objects
   */
  export function newUndoCalculationRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
    formSheet: GoogleAppsScript.Sheets.Schema.Sheet) {
    const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
    // sl = stock loss; only used to get some constants
    const slSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-loss");
    const userEnteredValueArray: string[] = [];
    slSheet.data[0].rowData[0].values.forEach(function(value) {
      userEnteredValueArray.push(value.userEnteredValue.stringValue);
    });
    const calculationColumnIndex = userEnteredValueArray.indexOf(formSheet.properties.title);
    const calculationColumn = Bus3.fromDimensionIndex(calculationColumnIndex, "COLUMNS");
    // Whole column length this time, so no -1 at the end
    const calculationColumnLength = String(Bus3.getDimensionLength(slSheet, calculationColumn));
    EggScript.calculationTitleArray.forEach(function(calculationTitle) {
      if (calculationTitle === "stock-price-initial")
        return;
      Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearCellRequest(
        Bus3.getSheetFromTitle(spreadsheet, calculationTitle), calculationColumn + calculationColumnLength));
    });
    return requestArray;
  }
  /**
   * Add a series to stock-price-chart representing the new column in stock-price.
   * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
   * @returns {GoogleAppsScript.Sheets.Schema.UpdateChartSpecRequest | null} Update the stock price chart, or don't
   */
  export function newUpdateStockPriceChartRequest(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet) {
    const stockPriceSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price");
    const stockPriceChartSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price-chart");
    const stockPriceChart = Bus3.getChartFromTitle(stockPriceChartSheet, "stock-price-chart");
    if (!stockPriceChart.spec.basicChart.series)
      stockPriceChart.spec.basicChart.series = [];
    if (Bus3.getDimensionLength(stockPriceSheet, 1) > stockPriceChart.spec.basicChart.series.length) {
      const updateChartSpecRequest = Sheets.newUpdateChartSpecRequest();
      updateChartSpecRequest.chartId = stockPriceChart.chartId;
      updateChartSpecRequest.spec = stockPriceChart.spec;
      const basicChartSeries = Sheets.newBasicChartSeries();
      basicChartSeries.series = Sheets.newChartData();
      basicChartSeries.series.sourceRange = Sheets.newChartSourceRange();
      const stockPriceRangeColumn =
        Bus3.fromDimensionIndex(Bus3.getDimensionLength(stockPriceSheet, 1) - 1, "COLUMNS");
      const stockPriceRange = `${stockPriceRangeColumn}:${stockPriceRangeColumn}`;
      basicChartSeries.series.sourceRange.sources =
        [Bus3.newGridRange(stockPriceSheet, stockPriceRange)];
      basicChartSeries.targetAxis = "LEFT_AXIS";
      updateChartSpecRequest.spec.basicChart.series.push(basicChartSeries);
      return updateChartSpecRequest;
    } else {
      return null;
    }
  }
}
