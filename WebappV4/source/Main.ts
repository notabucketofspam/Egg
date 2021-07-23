/**
 * Serve the main HTML file.
 * @param {Webapp.GogleAppsScript.EventType} event A very specific event
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The central webapp page
 */
function doGet(event: Webapp.GogleAppsScript.EventType) {
  return HtmlService.createHtmlOutputFromFile("html/index");
}
/**
 * Request some kind of server-side operation to be done.
 * @param {Webapp.GogleAppsScript.EventType} event An event that (hopefully) includes PostData
 */
function doPost(event: Webapp.GogleAppsScript.EventType) {

}
