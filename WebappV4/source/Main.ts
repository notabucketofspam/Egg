/**
 * Serve the main HTML file.
 * @param {Webapp.GogleAppsScript.EventType} event A very specific event
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The central webapp page
 */
function doGet(event: Webapp.GogleAppsScript.EventType) {
  return HtmlService.createTemplateFromFile("html/Index").evaluate().setTitle("Eggonomics WebappV4 (probably)")
    .setFaviconUrl("http://eggonomics.net/favicon.ico");
}
/**
 * Add an HTML element to a page. Note: requires client-side actions to load.
 * @param {string} file The element to install
 * @returns {string} The parsed element
 */
function installHtmlElement(file: string) {
  return HtmlService.createTemplateFromFile(file).evaluate().getContent();
}
