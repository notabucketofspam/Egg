/**
 * Hail traveler! Run this function please!
 */
function newUsersPleaseRunThis() {
  Logger.log(`New user: ${Session.getActiveUser()}`);
}
/**
 * Get the homepage for Sheets
 * @param {any} event The "open homepage" event
 * @returns {GoogleAppsScript.Card_Service.Card} The homepage Card
 */
function onSheetsHomepage(event) {
  return createSheetsAddOnView(event);
}
/**
 * Get the Sheets homepage
 * @param {any} event A "file scope granted" event, or something
 * @returns {GoogleAppsScript.Card_Service.Card} A Card with the homepage
 */
function onFileScopeGranted(event) {
  return createSheetsAddOnView(event);
}
/**
 * Fires when trying to get file access permission
 * @returns {any} It's supposed to be an instance of EditorFileScopeActionResponse, but TypeScript messed it up
 */
function onRequestFileScopeButtonClicked() {
  return (CardService as any).newEditorFileScopeActionResponseBuilder().requestFileScopeForActiveDocument().build();
}
/**
 * 
 * Taken partially from here and here
 * https://developers.google.com/workspace/add-ons/editors/gsao/editor-actions
 * https://developers.google.com/workspace/add-ons/concepts/event-objects
 * @param {any} event Some sort of editor event (probably a Sheets one)
 * @returns {GoogleAppsScript.Card_Service.Card} The brand-new Card to display
 */
function createSheetsAddOnView(event) {
  const cardSection = CardService.newCardSection();
  if (event["sheets"]["addonHasFileScopePermission"]) {
    cardSection.addWidget(CardService.newTextParagraph().setText("Ok mate, we're ready to roll."));
    const buttonAction = CardService.newAction().setFunctionName("openWebappInterface").setParameters({});
    const button = CardService.newTextButton().setText("Open webapp").setOnClickAction(buttonAction);
    cardSection.addWidget(button);
  } else {
    cardSection.addWidget(CardService.newTextParagraph().setText("Need some permissions, man."));
    const buttonAction = CardService.newAction().setFunctionName("onRequestFileScopeButtonClicked");
    const button = CardService.newTextButton().setText("Give 'em").setOnClickAction(buttonAction);
    cardSection.addWidget(button);
  }
  return CardService.newCardBuilder().addSection(cardSection).build();
}
/**
 * Get the central webapp page, or change its dimensions
 * @param {any} pageDimensions The dimensions, if any, to set
 * @param {number} [pageDimensions.pageWidth] Width in pixels
 * @param {number} [pageDimensions.pageHeight] Height in pixels
 */
function openWebappInterface({ pageWidth = 1024, pageHeight = 768 }) {
  const webappHtmlOutput = HtmlService.createTemplateFromFile("IndexAddOn").evaluate()
    .setWidth(pageWidth).setHeight(pageHeight);
  SpreadsheetApp.getUi().showModalDialog(webappHtmlOutput, "Eggonomics");
}
