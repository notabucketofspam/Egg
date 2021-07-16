import EggUtil from "./EggUtil";
/**
 * Bunch of utilities for calculationg stock price and stuff
 */
namespace StockPrice {
  /**
   * List of what territories belong to which industries
   */
  const industryRegistry = {
    Black: ["Charlie", "Kilo", "Romeo", "Zulu"],
    Blue: ["Zero", "One"],
    Brown: ["Alpha", "Bravo"],
    Cyan: ["Delta", "Echo", "Foxtrot"],
    Green: ["Whiskey", "X-ray", "Yankee"],
    Magenta: ["Golf", "India", "Juliett"],
    Orange: ["Lima", "Mike", "November"],
    Red: ["Oscar", "Papa", "Quebec"],
    White: ["Hotel", "Uniform"],
    Yellow: ["Sierra", "Tango", "Victor"]
  };
  /**
   * Calculate stock price delta for the relevant stocks given a list of the last four industry results
   * @param {Submission[]} results An array of the latest four industry results
   * @returns {Object} A thing that contains a bunch of numbers
   */
  export function delta(latest: EggUtil.Submission[]) {

  }
}
export default StockPrice;
