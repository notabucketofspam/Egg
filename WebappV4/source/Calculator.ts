/** A stock trade between players */
interface StockTrade {
  terr: string;
  tx: string;
  rx: string;
  count: number;
  markdown: number;
  sum: number;
}
/**
 * Deal with swapping of stocks.
 */
function processStockTrade() {

}
/** A monetary transaction */
interface Transaction {
  tx: string;
  rx: string;
  amount: number;
}
/**
 * Handle the flow of cash from one person to another.
 */
function processTransaction() {

}
