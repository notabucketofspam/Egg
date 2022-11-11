import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  constructor() { }
  gen() {
    return Date.now().toString(16).padStart(14, "0");
  }
}
