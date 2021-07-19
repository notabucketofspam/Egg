import EggUtil from "./EggUtil";
/**
 * Bunch of utilities for calculationg stock price and stuff
 */
namespace StockPrice {
  /**
   * List of what territories belong to which industries
   */
  const industryRegistry: Record<string, string[]> = {
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
   * Calculate change in price for the relevant stocks given a list of the last four industry results
   * @param {EggUtil.ExtArray<EggUtil.Submission>} results An array of the latest handful of industry results
   * @returns {Record<string, number>} A thing that contains a bunch of numbers
   */
  export function delta(results: EggUtil.ExtArray<EggUtil.Submission>) {
    // TODO do stock price calculations
    const delta: Record<string, number> = {};
    industryRegistry[results[0].industry].forEach(function (industry) {

    });
    return delta;
  }
}
export default StockPrice;
