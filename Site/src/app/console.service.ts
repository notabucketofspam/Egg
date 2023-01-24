import { Injectable } from '@angular/core';
import { environment } from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ConsoleService {
  /** Log if in development */
  log = console.log;
  /** Force log, even if outside of development */
  logf = console.log;
  constructor() {
    if (environment.production)
      this.log = (...args: any[]) => void 0;
  }
}
