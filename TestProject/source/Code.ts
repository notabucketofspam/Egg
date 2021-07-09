/**
 * Serve HTML.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The web app HTML page
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("html/Index");
}
/**
 * Test some HTML stuffs
 * @param {any} form From Index.html
 */
function processFormSubmission(form: any) {
  Logger.log(JSON.parse(form["sheet-select"]));
}
/**
 * Do the thing
 */
function testFunction() {
  sauce.sauceFunction();
  Logger.log(sauce);
  console.log(globalThis);
  console.log(Bus3.defaultSpreadsheetFieldMask);
}
