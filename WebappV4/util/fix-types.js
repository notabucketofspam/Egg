const replace = require("replace-in-file");
const options = {
  from: "declare var console",
  to: "//declare var _console",
  files: "../node_modules/@types/google-apps-script/google-apps-script.base.d.ts"
};
try {
  console.log(replace.sync(options).filter(result => result.hasChanged).map(result => result.file).join("\n"));
} catch (error) {
  console.log("Failed");
}
