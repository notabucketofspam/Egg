/**
* Hopefully this works...
*/
function libraryFn() {
  Logger.log("big sauce comin' your way");
}
/**
 * Thing do
 */
var Library: Record<string, any> = {};
/**
 * Wow look at this
 */
//Object.defineProperty(Library, "libraryFn", libraryFn);
Library.libraryFn = libraryFn;
//globalThis.Library = Library;
