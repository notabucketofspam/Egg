import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
  constructor(private websocket: WebSocketService) { }
  private buttonToggled = false;
  buttonText = "Plug it in, coach";
  messages: string[] = [];
  private subscriptions: Record<string, Subscription> = {};
  toggleWebSocket() {
    this.buttonToggled = !this.buttonToggled;
    if (this.buttonToggled) {
      // Connect to WebSocket
      this.buttonText = "Get it outta here";
      this.subscriptions["toggle"] = this.websocket.subscribe();
      this.messages.push("New connection.");
      if (!environment.production)
        this.messages.push("Check console (F12) for pings.");
    } else {
      // Disconnect from WebSocket
      this.subscriptions["toggle"].unsubscribe();
      this.buttonText = "Plug it in, coach";
      this.messages.push("Closed connection.");
    }
  }
  listGames() {
    this.subscriptions["ls"] = this.websocket.subscribe({
      next: (value) => {
        const reply = JSON.parse(value as string) as Next;
        if (reply.cmd === Cmd.Ls)
          this.messages.push(value as string);
        this.subscriptions["ls"].unsubscribe();
      }
    });
    this.websocket.nextJ({ cmd: Cmd.Ls });
  }
  ngOnDestroy() {
    if (this.subscriptions["toggle"])
      this.subscriptions["toggle"].unsubscribe();
    if (this.subscriptions["ls"])
      this.subscriptions["ls"].unsubscribe();
  }
}
