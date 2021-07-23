/**
 * Serve an HTML file.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The webapp HTML page
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("html/index.html");
}
/**
 * sauce
 */
function sauce() {
  Logger.log("sauce");
}
