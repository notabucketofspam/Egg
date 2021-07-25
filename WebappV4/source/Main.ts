/**
 * Serve the main HTML file.
 * @param {Webapp.GogleAppsScript.EventType} event A very specific event
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The central webapp page
 */
function doGet(event: Webapp.GogleAppsScript.EventType) {
  return HtmlService.createTemplateFromFile("html/Index").evaluate().setTitle("WebappV4")
    .setFaviconUrl("https://storage.googleapis.com/eggonomics/EggLogoV3.png");
}
/**
 * Request some kind of server-side operation to be done.
 * @param {Webapp.GogleAppsScript.EventType} event An event that (hopefully) includes PostData
 */
function doPost(event: Webapp.GogleAppsScript.EventType) {

}
/**
 * Add an HTML element to a page. Note: requires client-side actions to load.
 * @param {string} file The element to install
 * @returns {string} The parsed element
 */
function installHtmlElement(file: string) {
  return HtmlService.createTemplateFromFile(file).evaluate().getContent();
}
/**
 * Respond to a request for an OAuth 2.0 token.
 * @returns {string} The client's token
 */
function getOauthToken() {
  return ScriptApp.getOAuthToken();
}
/**
 * Test functions
 */
function logActiveUserEmail() {
  Logger.log(Session.getActiveUser().getEmail());
}
function modSpreadsheet(spreadsheetId) {
  Logger.log(spreadsheetId);
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  Logger.log(spreadsheet);
}
