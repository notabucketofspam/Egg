import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { WebSocketService } from '../websocket.service';
import { environment } from "../../environments/environment";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
  constructor(private websocket: WebSocketService) { }
  messages: string[] = [];
  private subscriptions: Record<string, Subscription> = {};
  showLists: Record<string, boolean> = {
    online: false,
    local: false,
    message: false
  };
  onlineList?: Record<string, string[]>;
  listOnlineGames() {
    //this.subscriptions["ls"] = this.websocket.subscribe({
    //  next: (value) => {
    //    const reply = JSON.parse(value as string) as Next;
    //    if (reply.cmd === Cmd.Ls) {
    //      this.showLists["online"] = true;
    //      this.showLists["local"] = false;
    //      this.showLists["messages"] = false;
    //      this.onlineList = (reply as List).games;
    //      this.subscriptions["ls"].unsubscribe();
    //    }
    //  }
    //});
    //this.websocket.nextJ({ cmd: Cmd.Ls });
    fetch(environment.cmdUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: Cmd.Ls })
    }).then(res => res.json()).then((list: List) => {
      this.showLists["online"] = true;
      this.showLists["local"] = false;
      this.showLists["messages"] = false;
      this.onlineList = list.games;
    });
  }
  ngOnDestroy() {
    if (this.subscriptions["ls"])
      this.subscriptions["ls"].unsubscribe();
  }
  showList($event: string) {
    switch ($event) {
      case "local": {
        this.showLists["online"] = false;
        this.showLists["local"] = true;
        this.showLists["messages"] = false;
        break;
      }
      case "messages": {
        this.showLists["online"] = false;
        this.showLists["local"] = false;
        this.showLists["messages"] = true;
        break;
      }
      case "none": {
        this.showLists["online"] = false;
        this.showLists["local"] = false;
        this.showLists["messages"] = false;
        break;
      }
      default: break;
    }
  }
}
