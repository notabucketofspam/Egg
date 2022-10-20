import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameSyncService {
  lastCommand?: string;
  constructor() { }
}
