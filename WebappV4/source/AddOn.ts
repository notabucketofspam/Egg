/**
 * Hail traveler! Run this function please!
 */
function newUsersPleaseRunThis() {
  Logger.log(`New user: ${Session.getActiveUser().getEmail()}`);
}
/**
 * Get the homepage for Sheets.
 * @param {any} event The "open homepage" event
 * @returns {GoogleAppsScript.Card_Service.Card} The homepage Card
 */
function onSheetsHomepage(event: any) {
  return createSheetsAddOnView(event);
}
/**
 * Get the Sheets homepage.
 * @param {any} event A "file scope granted" event, or something
 * @returns {GoogleAppsScript.Card_Service.Card} A Card with the homepage
 */
function onFileScopeGranted(event: any) {
  return createSheetsAddOnView(event);
}
/**
 * Fires when trying to get file access permission.
 * @returns {any} It's supposed to be an instance of EditorFileScopeActionResponse, but TypeScript messed it up
 */
function onRequestFileScopeButtonClicked() {
  return (CardService as any).newEditorFileScopeActionResponseBuilder().requestFileScopeForActiveDocument().build();
}
/**
 * Generate the side panel for Sheets.
 * Taken partially from here and here
 * https://developers.google.com/workspace/add-ons/editors/gsao/editor-actions
 * https://developers.google.com/workspace/add-ons/concepts/event-objects
 * @param {any} event Some sort of editor event (probably a Sheets one)
 * @returns {GoogleAppsScript.Card_Service.Card} The brand-new Card to display
 */
function createSheetsAddOnView(event: any) {
  const cardSection = CardService.newCardSection();
  if (event["sheets"]["addonHasFileScopePermission"]) {
    cardSection.addWidget(CardService.newTextParagraph().setText("Ok mate, we're ready to roll."));
    const openAction = CardService.newAction().setFunctionName("openWebappInterface").setParameters({});
    const openButton = CardService.newTextButton().setText("Open webapp").setOnClickAction(openAction);
    cardSection.addWidget(openButton);
    // newDivider method is missing in the original type definitions
    cardSection.addWidget((CardService as any).newDivider());
    const initAction = CardService.newAction().setFunctionName("initializeSpreadsheet");
    const initButton = CardService.newTextButton().setText("Initialize spreadsheet").setOnClickAction(initAction);
    cardSection.addWidget(initButton);
  } else {
    cardSection.addWidget(CardService.newTextParagraph().setText("Need some permissions, man."));
    const permAction = CardService.newAction().setFunctionName("onRequestFileScopeButtonClicked");
    const permButton = CardService.newTextButton().setText("Give 'em").setOnClickAction(permAction);
    cardSection.addWidget(permButton);
  }
  return CardService.newCardBuilder().addSection(cardSection).build();
}
/**
 * Get the central webapp page, or change its dimensions.
 * @param {any} pageDimensions The dimensions, if any, to set
 * @param {number} [pageDimensions.pageWidth] Width in pixels
 * @param {number} [pageDimensions.pageHeight] Height in pixels
 */
function openWebappInterface({ pageWidth = 1024, pageHeight = 768 }) {
  const webappHtmlOutput = HtmlService.createTemplateFromFile("html/IndexAddOn").evaluate()
    .setWidth(pageWidth).setHeight(pageHeight);
  SpreadsheetApp.getUi().showModalDialog(webappHtmlOutput, "Eggonomics");
}
/**
 * Prepare the spreadsheet for first-time use.
 */
function initializeSpreadsheet() {
  // Lock spreadsheet
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  // Constants
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const spreadsheet = Bus3.getSpreadsheet(spreadsheetId);
  const requestArray: GoogleAppsScript.Sheets.Schema.Request[] = [];
  const sheetStocks = Bus3.getSheetFromTitle(spreadsheet, "Stocks");
  // Headings
  const userEmailArray = sheetStocks.data[0].rowData[0].values.map(cellData => cellData.userEnteredValue.stringValue);
  const territoryArray = sheetStocks.data[0].rowData.map(row => row.values[0].effectiveValue.stringValue);
  // Start the for loops at 1 to skip irrelevant headings
  for (let columnIndex = 1; columnIndex < userEmailArray.length; ++columnIndex)
    for (let rowIndex = 1; rowIndex < territoryArray.length; ++rowIndex)
      // Check to see if the cell is empty
      if (!sheetStocks.data[0].rowData[rowIndex].values[columnIndex])
        Bus3.requestArrayPush(requestArray, "updateCells", Bus3.newUpdateSingleCellRequest(sheetStocks, 0 as any,
          Bus3.fromDimensionIndex(columnIndex, "COLUMNS") + Bus3.fromDimensionIndex(rowIndex, "ROWS")));
  // Update and unlock
  Bus3.batchUpdate(requestArray, spreadsheetId);
  lock.releaseLock();
  // Report to user
  SpreadsheetApp.getUi().alert("Spreadsheet initialized");
}
