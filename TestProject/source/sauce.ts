namespace sauce {
  export function sauceFunction() {
    Logger.log("sauce");
  }
  export function sauceFunctionTwo() {
    Logger.log("sauce2");
  }
  export function sauceClone() {
    sauce.sauceFunction();
  }
  export const sauceString = "saucy";
}
Object.keys(sauce).forEach(function(prop) {
  Object.defineProperty(globalThis, prop, Object.getOwnPropertyDescriptor(sauce, prop));
});
