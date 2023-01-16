import { Component, OnDestroy } from '@angular/core';

import { environment } from "../../environments/environment";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
  constructor() { }
  messages: string[] = [];
  showLists: Record<string, boolean> = {
    online: false,
    local: false,
    message: false
  };
  onlineList?: Record<string, string[]>;
  listOnlineGames() {
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
  ngOnDestroy() { }
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
