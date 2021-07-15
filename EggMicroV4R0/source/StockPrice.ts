import { ObjectType } from "deta/dist/types/types/basic";
/**
 * Bunch of utilities for calculationg stock price
 */
namespace StockPrice {
  /**
   * A user-entered form submission
   */
  export interface Submission {
    extraData: Object;
    industry: string;
    stockCountEnd: number;
    stockCountStart: number;
    territory: string;
    timestamp: number;
    winLose: boolean;
  }
  /**
   * Basically just an array that can have other arrays slapped onto it
   * Partially taken from here and here:
   * https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating/17368101#17368101
   * https://stackoverflow.com/questions/767486/how-do-you-check-if-a-variable-is-an-array-in-javascript
   */
  export class ExtendableArray extends Array {
    constructor() {
      super();
    }
    /**
     * Stick another array on the end of this one
     * @param {any[]} otherArray The other array to merge with
     * @returns {StockPrice.ExtendableArray} itself, so that it can be chained
     */
    extend(otherArray: any[]) {
      if (Array.isArray(otherArray)) {
        const newLocal = this;
        otherArray.forEach(function (v) {
          newLocal.push(v);
        }, this);
      }
      return this;
    }
  }
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
   * @param {Submission[]} latest An array of the latest four industry results
   * @returns {Object} A thing that contains a bunch of numbers
   */
  export function delta(latest: Submission[]) {

  }
}
export default StockPrice;
