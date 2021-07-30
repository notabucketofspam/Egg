// Thanks to here for making ObjectType unnecessary: https://stackoverflow.com/a/44441178
import EggUtil from "./EggUtil";
import Base from "deta/dist/types/base";
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
  export function delta(results: EggUtil.ExtArray<EggUtil.Submission>, options: DeltaOptions =
    { winMult: 4, loseMult: 3.8, industryWinMult: 2, industryLoseMult: 1.9 }, inclusionRange = 4) {
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
        weightedAverageStockLoss = weightedAverageStockLoss ? weightedAverageStockLoss : 
          Math.pow(2, 1 - inclusionRange);
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
  /**
   * Grab the last couple of submissions using Deta's suboptimal <1.0.0 Base API
   * @param {Base} database The Deta Base to utilize
   * @param {string} industry Whatever industry you're looking for
   * @param {number} [inclusionRange=4] How many results to return
   * @returns {Promise<ExtArray<Submission>[]>} ExtArray with a handful of submisions and some stuff to delete
   */
  export async function fetchLastIndustryResults(database: Base, industry: string, inclusionRange = 4) {
    const results = new EggUtil.ExtArray<EggUtil.Submission>();
    const deletables = new EggUtil.ExtArray<EggUtil.Submission>();
    const fetchResponse = await (database.fetch as any)({ industry }, Infinity, 4266);
    for await (const buffer of fetchResponse)
      deletables.extend(results.extend(buffer).sort((a, b) => b.timestamp - a.timestamp).splice(inclusionRange));
    return [results.reverse() as typeof results, deletables];
  }
  /**
   * Calculate the final price of eaach affected stock.
   * @param {Base} database The Deta Base to use
   * @param {string} industry The relevant industry
   * @returns {Promise<Promise<null>[]>} List of Promises to update / delete
   */
  export async function calculate(database: Base, industry: string) {
    // Grab the last few results
    const [results, deletables] = await fetchLastIndustryResults(database, industry);
    // Calculate price changes
    const stockPriceDelta = delta(results);
    // Update stock prices in the DB
    const stockPrice = ((await database.get("!stockPrice")) as any).extraData as Record<string, number>;
    const stockPriceUpdates: Record<string, number> = {};
    Object.entries(stockPriceDelta).forEach(function ([territory, value]) {
      stockPriceUpdates[`extraData.${territory}`] = Math.max(stockPrice[territory] + value, 5);
    });
    const promiseArray: Promise<null>[] = [];
    promiseArray.push(database.update(stockPriceUpdates, "!stockPrice"));
    // Delete old entries in the DB
    deletables.forEach(function (submission) {
      promiseArray.push(database.delete(submission.key));
    });
    return promiseArray;
  }
}
export default StockPrice;
