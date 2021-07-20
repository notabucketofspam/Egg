import EggUtil from "./EggUtil";
/**
 * Bunch of utilities for calculationg stock price and stuff
 */
namespace StockPrice {
  export interface DeltaOptions {
    winMult: number;
    loseMult: number;
    industryWinMult: number;
    industryLoseMult: number;
  }
  /**
   * Calculate change in price for the relevant stocks given a list of the last four industry results
   * @param {EggUtil.ExtArray<EggUtil.Submission>} results An array of the latest handful of industry results
   * @param {DeltaOptions} [options] Set the various multipliers
   * @returns {Record<string, number>} A thing that contains a bunch of numbers
   */
  export function delta(results: EggUtil.ExtArray<EggUtil.Submission>,
    options: DeltaOptions = { winMult: 4, loseMult: 3.8, industryWinMult: 2, industryLoseMult: 1.9 }) {
    const delta: Record<string, number> = {};
    // Can safely calculate these constants outside of the center forEach loop
    const winCount = results.map(function (submission) {
      return submission.territory === results.last().territory ? submission.winLose : false;
    }).filter(element => element).length;
    const loseCount = results.map(function (submission) {
      return submission.territory === results.last().territory ? !submission.winLose : false;
    }).filter(element => element).length;
    const industryWinCount = results.map(submission => submission.winLose).filter(element => element).length;
    const industryLoseCount = results.map(submission => !submission.winLose).filter(element => element).length;
    // Iterate over the territories in the relevant industry
    EggUtil.industryRegistry[results[0].industry].forEach(function (territory) {
      let weightedAverageStockLoss = 0;
      let winLoseDividend = 0;
      // Substitute for NOT(ISBLANK())
      if (territory === results.last().territory) {
        const stockLossArray = results.map(function (submission) {
          return submission.territory === results.last().territory ?
            submission.stockCountStart - submission.stockCountEnd : -1;
        }).filter(element => element !== -1);
        const averageStockLossArray = results.map(function (submission) {
          return submission.territory === results.last().territory ?
            stockLossArray.reduce((a, b) => a + b) / stockLossArray.length : -1;
        }).filter(element => element !== -1);
        const stockLossWeightArray = results.map(function (submission) {
          return submission.territory === results.last().territory ?
            (submission.stockCountStart - submission.stockCountEnd) / submission.stockCountStart : -1;
        }).filter(element => element !== -1);
        weightedAverageStockLoss = stockLossArray.reduce((a, b) => a + b) ?
          averageStockLossArray.map(function (element, index) {
            return element * stockLossWeightArray[index];
          }).reduce((a, b) => a + b) / stockLossWeightArray.reduce((a, b) => a + b) :
          averageStockLossArray.reduce((a, b) => a + b) / averageStockLossArray.length;
        winLoseDividend = Math.pow(options.winMult, winCount) - Math.pow(options.loseMult, loseCount);
      } else {
        winLoseDividend = Math.pow(options.industryWinMult, industryWinCount) -
          Math.pow(options.industryLoseMult, industryLoseCount) + Math.pow(options.winMult, winCount) -
          Math.pow(options.loseMult, loseCount);
      }
      delta[territory] = weightedAverageStockLoss ? winLoseDividend / weightedAverageStockLoss : winLoseDividend;
    });
    return delta;
  }
}
export default StockPrice;
