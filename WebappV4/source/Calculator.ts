/** A stock trade between players */
interface StockTrade {
  terr: string;
  tx: string;
  rx: string;
  count: number;
  markdown: number;
  sum: number;
}
/** A monetary transaction */
interface Transaction {
  tx: string;
  rx: string;
  amount: number;
}
/**
 * Deal with swapping of stocks.
 * @param {StockTrade} stockTrade The stock trade object
 */
function processStockTrade(stockTrade: StockTrade) {
  // Acquire document lock, if possible
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  // Get constants
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  const sheetStocks = Bus3.getSheetFromTitle(spreadsheet, "Stocks");
  // Check if the sheet is out of rows
  if (sheetStocks.data[0].rowData.length >= sheetStocks.properties.gridProperties.rowCount)
    Bus3.requestArrayPush(requestArray, "appendDimension",
      Bus3.newAppendDimensionRequest(sheetStocks, "ROWS", 1));
  // Get column headings
  const userEmailArray = sheetStocks.data[0].rowData[0].values.map(cellData => cellData.userEnteredValue.stringValue);
  // Get row headings
  const territoryArray = sheetStocks.data[0].rowData.map(row => row.values[0].effectiveValue.stringValue);
  const terrRowIndex = territoryArray.indexOf(stockTrade.terr);
  // Count
  [stockTrade.tx, stockTrade.rx].forEach(function (value, index) {
    const columnIndex = userEmailArray.indexOf(value);
    const countCellData = sheetStocks.data[0].rowData[terrRowIndex].values[columnIndex];
    const countEffectiveValue = countCellData ? countCellData.effectiveValue : null;
    const countNumberValue = countEffectiveValue ? countEffectiveValue.numberValue : 0;
    const countNewNumberValue = index === 0 ? countNumberValue - stockTrade.count :
      countNumberValue + stockTrade.count;
    const request = Bus3.newUpdateSingleCellRequest(sheetStocks, countNewNumberValue as any,
      Bus3.fromDimensionIndex(columnIndex, "COLUMNS") + Bus3.fromDimensionIndex(terrRowIndex, "ROWS"));
    Bus3.requestArrayPush(requestArray, "updateCells", request);
  });
  // Sum
  const transaction: Transaction = {
    tx: stockTrade.rx,
    rx: stockTrade.tx,
    amount: stockTrade.sum
  };
  const transactionRequestArray = newTransactionRequestArray(spreadsheet, transaction);
  Array.prototype.push.apply(requestArray, transactionRequestArray);
  // Send update and release lock
  Bus3.batchUpdate(requestArray, spreadsheetId);
  lock.releaseLock();
}
/**
 * Handle the flow of cash from one person to another.
 * @param {Transaction} transaction The transaction object
 */
function processTransaction(transaction: Transaction) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = newTransactionRequestArray(spreadsheet, transaction);
  Bus3.batchUpdate(requestArray, spreadsheetId);
  lock.releaseLock();
}
/**
 * Intermediate function for processStockTrade() and processTransaction() since both require monetary transfers.
 * @param {GoogleAppsScript.Sheets.Schema.Spreadsheet} spreadsheet The Transactions sheet
 * @param {Transaction} transaction A transaction object
 * @returns {GoogleAppsScript.Sheets.Schema.Request[]} Cell updates for the Transactions sheet
 */
function newTransactionRequestArray(spreadsheet: GoogleAppsScript.Sheets.Schema.Spreadsheet,
  transaction: Transaction) {
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  const sheetTransactions = Bus3.getSheetFromTitle(spreadsheet, "Transactions");
  // Check if the sheet is out of rows
  if (sheetTransactions.data[0].rowData.length >= sheetTransactions.properties.gridProperties.rowCount)
    Bus3.requestArrayPush(requestArray, "appendDimension",
      Bus3.newAppendDimensionRequest(sheetTransactions, "ROWS", 1));
  // Grab the column headings from the first row
  const userEmailArray = sheetTransactions.data[0].rowData[0].values
    .map(cellData => cellData.userEnteredValue.stringValue);
  // Amount
  [transaction.tx, transaction.rx].forEach(function (value, index) {
    const columnIndex = userEmailArray.indexOf(value);
    const newRowIndex = Bus3.getDimensionLength(sheetTransactions, Bus3.fromDimensionIndex(columnIndex, "COLUMNS"));
    // A bug within Bus3.newUpdateSingleCellRequest() requires the use of a cast below
    const amount = index === 0 ? -transaction.amount : transaction.amount;
    const request = Bus3.newUpdateSingleCellRequest(sheetTransactions, amount as any,
      Bus3.fromDimensionIndex(columnIndex, "COLUMNS") + Bus3.fromDimensionIndex(newRowIndex, "ROWS"));
    Bus3.requestArrayPush(requestArray, "updateCells", request);
  });
  return requestArray;
}
