import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
  constructor(private websocket: WebSocketService) { }
  messages: string[] = [];
  private subscriptions: Record<string, Subscription> = {};
  listGames() {
    this.subscriptions["ls"] = this.websocket.subscribe({
      next: (value) => {
        const reply = JSON.parse(value as string) as Next;
        if (reply.cmd === Cmd.Ls) {
          this.messages.length = 0;
          this.messages.push("Remote games:");
          this.messages.push(value as string);
        }
        this.subscriptions["ls"].unsubscribe();
      }
    });
    this.websocket.nextJ({ cmd: Cmd.Ls });
  }
  ngOnDestroy() {
    if (this.subscriptions["ls"])
      this.subscriptions["ls"].unsubscribe();
  }
}
