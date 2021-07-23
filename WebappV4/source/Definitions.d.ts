/**
 * Definitions specific to the Egg application
 */
declare module Webapp {
  /**
   * Definitions used for Google Apps Script that aren't included by default
   */
  module GogleAppsScript {
    /**
     * Used with doGet() and doPost()
     */
    interface EventType {
      queryString?: string | null;
      parameter?: Record<string, string>;
      parameters?: Record<string, string[]>;
      contextPath?: string;
      contentLength?: number;
      postData?: PostData;
    }
    /**
     * Used only with doPost()
     */
    interface PostData {
      length?: number;
      type?: string;
      contents?: string;
      name?: string;
    }
  }
}
