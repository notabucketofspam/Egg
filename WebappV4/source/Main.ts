/**
 * Serve an HTML file.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The webapp HTML page
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("html/index");
}
/**
 * sauce
 */
function sauceFn() {
  Logger.log("sauce");
}
/**
 * Test fetching stock prices from Deta
 */
function testFetch() {
  let response = UrlFetchApp.fetch("https://v86nf8.deta.dev/stock-prices");
  Logger.log(JSON.parse(response.getContentText()));
}
