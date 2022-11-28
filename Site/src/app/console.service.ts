import { Injectable } from '@angular/core';
import { environment } from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ConsoleService {
  constructor() { }
  /** Log if in development */
  log(...args: any[]) {
    if (!environment.production) {
      console.log(...args);
    }
  }
  /** Force log, even if outside of development */
  logf(...args: any[]) {
    console.log(...args);
  }
}
