import { Component } from '@angular/core';

import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private websocket: WebSocketService) { }
  title = 'Eggonomics';
  private buttonToggled = false;
  buttonText = "Plug it in, coach";
  messages: string[] = [];
  game = "sauce";
  toggleWebSocket() {
    this.buttonToggled = !this.buttonToggled;
    if (this.buttonToggled) {
      // Connect to WebSocket
      this.websocket.subscribe();
      this.buttonText = "Get it outta here";
      this.messages.push("New connection.", "Check console (F12) for pings.");
    } else {
      // Disconnect from WebSocket
      this.websocket.complete();
      this.buttonText = "Plug it in, coach";
      this.messages.push("Closed connection.");
    }
  }
}
