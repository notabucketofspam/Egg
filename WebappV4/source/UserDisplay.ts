/**
 * Give an overview of each user's stock ownership and financial status.
 * @returns {Record<string, string>[]} An array containing the displays
 */
function generateUserDisplay() {
  const displays: Record<string, string>[] = [];
  // Retrieve current user email, spreadsheet, and the relevant sheets
  const activeUserEmail = Session.getActiveUser().getEmail();
  const spreadsheet = Bus3.getSpreadsheet(SpreadsheetApp.getActiveSpreadsheet().getId());
  const sheetTransactions = Bus3.getSheetFromTitle(spreadsheet, "Transactions");
  const sheetStocks = Bus3.getSheetFromTitle(spreadsheet, "Stocks");
  // Grab the column headings from the first row
  const userEmailArray = sheetTransactions.data[0].rowData[0].values
    .map(cellData => cellData.userEnteredValue.stringValue);
  // Same as above, but for the other sheet
  const userEmailArray2 = sheetStocks.data[0].rowData[0].values
    .map(cellData => cellData.userEnteredValue.stringValue);
  // Check to make sure that both sheets include the active user email at the same column index
  if (!(userEmailArray.includes(activeUserEmail) && userEmailArray2.includes(activeUserEmail)) ||
    !(userEmailArray.indexOf(activeUserEmail) === userEmailArray2.indexOf(activeUserEmail)))
    throw new ReferenceError(`${activeUserEmail} either does not exist on the spreadsheet ` +
      `or exists at different indices.`);
  // Get the list of territories in the order they're in on the sheet
  const territoryArray = sheetStocks.data[0].rowData.map(row => row.values[0].effectiveValue.stringValue);
  // Parse from the HTML template
  const htmlTemplate = HtmlService.createTemplateFromFile("html/UserDisplayTemplate").evaluate().getContent();
  //let logOnceFlag = false;
  // Iterate over each user
  userEmailArray.forEach(function (userEmail, columnIndex) {
    //const rightNow = Date.now();
    // Skip the first column (row headings)
    if (!columnIndex)
      return;
    // Check for whitespace (which would create problems later)
    if (userEmail.match(/\s/))
      throw new SyntaxError(`${userEmail} contains whitespace.`);
    // Create a new display
    const display: Record<string, string> = {};
    display["div"] = userEmail === activeUserEmail ? "active-user-display" : "other-user-displays";
    // Create XML document from the HTML template
    const xmlDocument = XmlService.parse(htmlTemplate.replaceAll("USER_EMAIL", userEmail));
    const xmlDocumentElementArray = xmlDocument.getDescendants().map(content => content.asElement());
    // Add the user's transaction sum to the relevant place on the document
    const userSumEffectiveValue = sheetTransactions.data[0].rowData[1].values[columnIndex].effectiveValue;
    const userSum = userSumEffectiveValue.stringValue === "Infinity" ?
      "Infinity" : String(userSumEffectiveValue.numberValue);
    getElementById(xmlDocumentElementArray, `user-sum-${userEmail}`).setText(userSum);
    // Iterate over each territory
    territoryArray.forEach(function (territory, rowIndex) {
      // Skip the first row (column headings)
      if (!rowIndex)
        return;
      // Add the user's stock ownership of the territory to the relevant place on the table
      // Can assume that this is always not undefined if initializeSpreadsheet() has been run
      const stockCountNumberValue =
        sheetStocks.data[0].rowData[rowIndex].values[columnIndex].effectiveValue.numberValue;
      getElementById(xmlDocumentElementArray, `stock-own-${territory}-${userEmail}`)
        .setText(String(stockCountNumberValue));
    });
    // Add the parsed display to the return object
    display["content"] = XmlService.getPrettyFormat().format(xmlDocument);
    //if (logOnceFlag) {
    //  Logger.log(`Time for one iteration: ${Date.now() - rightNow}ms`);
    //  logOnceFlag = false;
    //}
    displays.push(display);
  });
  return displays;
}
/**
 * Similar to the DOM function of the same name.
 * Parts of this are taken from here
 * https://sites.google.com/site/scriptsexamples/learn-by-example/parsing-html
 * @param {GoogleAppsScript.XML_Service.Element[]} elementArray The descendants of this will be searched
 * @param {string} id The ID to find
 * @returns {GoogleAppsScript.XML_Service.Element} The element with the ID
 */
function getElementById(elementArray: GoogleAppsScript.XML_Service.Element[], id: string) {
  let element: GoogleAppsScript.XML_Service.Element;
  elementArray.some(function (currentElement) {
    // Assign content to element and return true
    if (currentElement && currentElement.getAttribute("id") && currentElement.getAttribute("id").getValue() === id)
      return void (element = currentElement) || true;
  });
  return element;
}
/**
 * Grab only the relevant numeric values instead of rendering the entire display again.
 * @returns {Record<string, Record<string, number>>} Updates for each user display
 */
function updateUserDisplay() {
  const updates: Record<string, Record<string, number>> = {};
  // Acquire constants
  const spreadsheet = Bus3.getSpreadsheet(SpreadsheetApp.getActiveSpreadsheet().getId());
  const sheetTransactions = Bus3.getSheetFromTitle(spreadsheet, "Transactions");
  const sheetStocks = Bus3.getSheetFromTitle(spreadsheet, "Stocks");
  // Get column / row headings
  const userEmailArray = sheetStocks.data[0].rowData[0].values.map(cellData => cellData.userEnteredValue.stringValue);
  const territoryArray = sheetStocks.data[0].rowData.map(row => row.values[0].effectiveValue.stringValue);
  for (let columnIndex = 1; columnIndex < userEmailArray.length; ++columnIndex) {
    // Create update
    const update: Record<string, number> = {};
    // Add sum to update
    const userSumEffectiveValue = sheetTransactions.data[0].rowData[1].values[columnIndex].effectiveValue;
    update["sum"] = userSumEffectiveValue.stringValue ?
      Number(userSumEffectiveValue.stringValue) : userSumEffectiveValue.numberValue;
    // Add territories to update
    for (let rowIndex = 1; rowIndex < territoryArray.length; ++rowIndex)
      update[territoryArray[rowIndex]] =
        sheetStocks.data[0].rowData[rowIndex].values[columnIndex].effectiveValue.numberValue;
    // Push update
    updates[userEmailArray[columnIndex]] = update;
  }
  return updates;
}
