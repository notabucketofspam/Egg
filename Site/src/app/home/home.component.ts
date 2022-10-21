import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment.prod';

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
  private subscription!: Subscription;
  toggleWebSocket() {
    this.buttonToggled = !this.buttonToggled;
    if (this.buttonToggled) {
      // Connect to WebSocket
      this.subscription = this.websocket.subscribe({
        next: (value) => {
          if (typeof value === "string")
            this.messages.push(value);
        }
      });
      this.websocket.next(JSON.stringify({ cmd: "ls" }));
      this.buttonText = "Get it outta here";
      this.messages.push("New connection.");
      if (!environment.production)
        this.messages.push("Check console (F12) for pings.");
    } else {
      // Disconnect from WebSocket
      this.subscription.unsubscribe();
      this.buttonText = "Plug it in, coach";
      this.messages.push("Closed connection.");
    }
  }
  ngOnDestroy() {
    if (this.buttonToggled) {
      this.buttonToggled = false;
      this.subscription.unsubscribe();
    }
  }
}
