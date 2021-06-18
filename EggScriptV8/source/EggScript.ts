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
    * @param {string} title The character sheet to add
    * @returns {GoogleAppsScript.Sheets.Schema.Request[]} Some UpdateCellRequest objects and an AddSheetRequest
    */
  export function newValidateSheetRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
    title: string) {
    let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
    if (!Bus3.getSheetFromTitle(spreadsheet, title)) {
      // Add a sheet with the specified title
      let addSheetRequest = Sheets.newAddSheetRequest();
      addSheetRequest.properties = Sheets.newSheetProperties();
      addSheetRequest.properties.title = title;
      Bus3.requestArrayPush(requestArray, "addSheet", addSheetRequest);
      // Make adjustments to each of the calculation sheets
      EggScript.calculationTitleArray.forEach(function(calculationTitle) {
        let sheet = Bus3.getSheetFromTitle(spreadsheet, calculationTitle);
        // Append the title
        let sheetColumnTitleListRowData = sheet.data[0].rowData && sheet.data[0].rowData[0] ?
          sheet.data[0].rowData[0] : Bus3.newRowData();
        sheetColumnTitleListRowData.values.push(Bus3.newCellData(title));
        let rows = [sheetColumnTitleListRowData];
        let fields = "userEnteredValue";
        let gridRange: GoogleAppsScript.Sheets.Schema.GridRange;
        if (calculationTitle === "stock-price-initial") {
          // Assign a random value as the initial stock price
          let sheetColumnPriceListRowData = sheet.data[0].rowData && sheet.data[0].rowData[1] ?
            sheet.data[0].rowData[1] : Bus3.newRowData();
          sheetColumnPriceListRowData.values.push(Bus3.newCellData("=TRUNC((" + Math.random() +
            "*('extra-data'!B4-'extra-data'!B5))+'extra-data'!B5,'extra-data'!B6)"));
          rows.push(sheetColumnPriceListRowData);
          gridRange = Bus3.newGridRange(sheet, "1:2");
        } else {
          // Only append title and do nothing else
          gridRange = Bus3.newGridRange(sheet, "1:1");
        }
        if (sheetColumnTitleListRowData.values.length >= sheet.properties.gridProperties.columnCount)
          Bus3.requestArrayPush(requestArray, "appendDimension", Bus3.newAppendDimensionRequest(sheet, "COLUMNS", 1));
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newUpdateCellsRequest(rows, fields, gridRange));
      });
    }
    return requestArray;
  }
  /**
    * Adds formulas to relevant cells in the calculation sheets.
    * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
    * @param {string} formSheetTitle Essentially, the character selected on the web app form
    * @returns {GoogleAppsScript.Sheets.Schema.Request[]} A bunch of UpdateCellRequest objects
    */
  export function newFormulaCalculationRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
    formSheetTitle: string) {
    let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
    let formSheet = Bus3.getSheetFromTitle(spreadsheet, formSheetTitle);
    // Ending row on formSheet, not on the calculation sheets, this is an important distinction
    let dataRowEnd = String(formSheet.data[0].rowData ? formSheet.data[0].rowData.length : 1);
    // Same idea as above but applied to the starting row
    let dataRowStart = `IF(GTE(${dataRowEnd},'extra-data'!B1),1+${dataRowEnd}-'extra-data'!B1,1)`;
    // sl = stock loss
    let slSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-loss");
    // Assume below that column indices, lengths, etc are constant, since all the data 
    // is being entered at the same time per row and calculationSheet columns 
    // should have the same index on every calculation sheet after being added by
    // newValidateSheetRequestArray() earlier in processFormSubmission()
    let userEnteredValueArray: string[] = [];
    slSheet.data[0].rowData[0].values.forEach(function(value) {
      userEnteredValueArray.push(value.userEnteredValue.stringValue);
    });
    let calculationColumnIndex = userEnteredValueArray.indexOf(formSheetTitle);
    let calculationColumn = Bus3.fromDimensionIndex(calculationColumnIndex, "COLUMNS");
    let calculationColumnNewDataRow = Bus3.getDimensionLength(slSheet, calculationColumn) + 1;
    let calculationCell = calculationColumn + calculationColumnNewDataRow;
    // +1 above and below to skip title for calculation sheets
    let calculationRowEnd = dataRowEnd + "+1";
    let calculationRowStart = dataRowStart + "+1";
    let slFormula = "=" +
      Bus3.indirectConcatenate(formSheetTitle, "B", dataRowEnd) + "-" +
      Bus3.indirectConcatenate(formSheetTitle, "C", dataRowEnd);
    let slRequest = Bus3.newUpdateSingleCellRequest(slSheet, slFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", slRequest);
    // asl = average stock loss
    let aslSheet = Bus3.getSheetFromTitle(spreadsheet, "average-stock-loss");
    let aslFormula = "=AVERAGE(" +
      Bus3.indirectConcatenate("stock-loss", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("stock-loss", calculationColumn, calculationRowEnd) + ")";
    let aslRequest = Bus3.newUpdateSingleCellRequest(aslSheet, aslFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", aslRequest);
    // slw = stock loss weight
    let slwSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-loss-weight");
    // Assigns a weight of one instead in the case where it would otherwise be zero
    // Probably not the mathematically correct way to do this, will maybe fix it later
    let slwFormula = "=IFERROR(IF(GT(VALUE(" +
      Bus3.indirectConcatenate(formSheetTitle, "B", dataRowEnd) + "),0)," +
      Bus3.indirectConcatenate("stock-loss", calculationColumn, calculationRowEnd) + "/" +
      Bus3.indirectConcatenate(formSheetTitle, "B", dataRowEnd) + ",0),1)";
    let slwRequest = Bus3.newUpdateSingleCellRequest(slwSheet, slwFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", slwRequest);
    // wasl = weighted average stock loss
    let waslSheet = Bus3.getSheetFromTitle(spreadsheet, "weighted-average-stock-loss");
    // What actually happens when both the averages and the weights are zero? Should this be fixed?
    // Right now it simply returns the average of the last inclusionRange data points in average-stock-loss,
    // but this probably isn't correct because it assumes that all the weights are one 
    // instead of zero. Although this theoretically shouldn't happen due to the hack in slwFormula above
    let waslFormula = "=IFERROR(AVERAGE.WEIGHTED(" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowEnd) + "," +
      Bus3.indirectConcatenate("stock-loss-weight", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("stock-loss-weight", calculationColumn, calculationRowEnd) + "),AVERAGE(" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowStart) + ":" +
      Bus3.indirectConcatenate("average-stock-loss", calculationColumn, calculationRowEnd) + "))";
    let waslRequest = Bus3.newUpdateSingleCellRequest(waslSheet, waslFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", waslRequest);
    // wlf = win-lose formula
    let wlfSheet = Bus3.getSheetFromTitle(spreadsheet, "win-lose-formula");
    let wlfFormula = "=IF(GTE(" + dataRowEnd + ",'extra-data'!B1),POWER('extra-data'!B2,COUNTIF(" +
      Bus3.indirectConcatenate(formSheetTitle, "A", dataRowStart) + ":" +
      Bus3.indirectConcatenate(formSheetTitle, "A", dataRowEnd) + ",TRUE))-POWER('extra-data'!B3,COUNTIF(" +
      Bus3.indirectConcatenate(formSheetTitle, "A", dataRowStart) + ":" +
      Bus3.indirectConcatenate(formSheetTitle, "A", dataRowEnd) + ",FALSE))," +
      Bus3.indirectConcatenate("stock-price-initial", calculationColumn, "2") + ")";
    let wlfRequest = Bus3.newUpdateSingleCellRequest(wlfSheet, wlfFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", wlfRequest);
    // spd = stock price delta
    let spdSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price-delta");
    // No change in stock price on the off chance that the weighted average fails to compute
    let spdFormula = "=IFERROR(IF(GTE(" + dataRowEnd + ",'extra-data'!B1)," +
      Bus3.indirectConcatenate("win-loss-formula", calculationColumn, calculationRowEnd) + "/" +
      Bus3.indirectConcatenate("weighted-average-stock-loss", calculationColumn, calculationRowEnd) + ",0),0)";
    let spdRequest = Bus3.newUpdateSingleCellRequest(spdSheet, spdFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", spdRequest);
    // sp = stock price
    let spSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price");
    let spFormula = "=TRUNC(IF(GTE(" + dataRowEnd + ",'extra-data'!B1)," +
      Bus3.indirectConcatenate("stock-price", calculationColumn, calculationRowEnd) + "+" +
      Bus3.indirectConcatenate("stock-price-delta", calculationColumn, calculationRowEnd) + "," +
      Bus3.indirectConcatenate("stock-price-initial", calculationColumn, "2") + "),'extra-data'!B6)";
    let spRequest = Bus3.newUpdateSingleCellRequest(spSheet, spFormula, calculationCell);
    Bus3.requestArrayPush(requestArray, "updateCells", spRequest);
    return requestArray;
  }
  /**
    * Essentially, pop an entry from each of the calculation sheets.
    * Some of this is similar to formulaCalculationRequestArray(), but in reverse.
    * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
    * @param {string} formSheetTitle Essentially, the character to undo the data input for
    * @returns {GoogleAppsScript.Sheets.Schema.Request[]} A bunch of UpdateCellRequest objects
    */
  export function newUndoCalculationRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
    formSheetTitle: string) {
    let requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
    // sl = stock loss; only used to get some constants
    let slSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-loss");
    let userEnteredValueArray: string[] = [];
    slSheet.data[0].rowData[0].values.forEach(function(value) {
      userEnteredValueArray.push(value.userEnteredValue.stringValue);
    });
    let calculationColumnIndex = userEnteredValueArray.indexOf(formSheetTitle);
    let calculationColumn = Bus3.fromDimensionIndex(calculationColumnIndex, "COLUMNS");
    // Whole column length this time, so no -1 at the end
    let calculationColumnLength = String(Bus3.getDimensionLength(slSheet, calculationColumn));
    EggScript.calculationTitleArray.forEach(function(sheetTitle) {
      if (sheetTitle !== "stock-price-initial") {
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newClearCellRequest(
          Bus3.getSheetFromTitle(spreadsheet, sheetTitle), calculationColumn + calculationColumnLength));
      }
    });
    return requestArray;
  }
  /**
    * Add a series to stock-price-chart representing the new column in stock-price.
    * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The spreadsheet object
    * @returns {GoogleAppsScript.Sheets.Schema.UpdateChartSpecRequest | null} Update the stock price chart, or don't
    */
  export function newUpdateStockPriceChartRequest(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet) {
    let stockPriceSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price");
    let stockPriceChartSheet = Bus3.getSheetFromTitle(spreadsheet, "stock-price-chart");
    let stockPriceChart = Bus3.getChartFromTitle(stockPriceChartSheet, "stock-price-chart");
    if (!stockPriceChart.spec.basicChart.series)
      stockPriceChart.spec.basicChart.series = [];
    if (Bus3.getDimensionLength(stockPriceSheet, 1) > stockPriceChart.spec.basicChart.series.length) {
      let updateChartSpecRequest = Sheets.newUpdateChartSpecRequest();
      updateChartSpecRequest.chartId = stockPriceChart.chartId;
      updateChartSpecRequest.spec = stockPriceChart.spec;
      let basicChartSeries = Sheets.newBasicChartSeries();
      basicChartSeries.series = Sheets.newChartData();
      basicChartSeries.series.sourceRange = Sheets.newChartSourceRange();
      let stockPriceRangeColumn =
        Bus3.fromDimensionIndex(Bus3.getDimensionLength(stockPriceSheet, 1) - 1, "COLUMNS");
      let stockPriceRange = `${stockPriceRangeColumn}:${stockPriceRangeColumn}`;
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
