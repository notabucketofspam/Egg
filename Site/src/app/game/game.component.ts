import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { WebSocketMessage } from 'rxjs/internal/observable/dom/WebSocketSubject';
import { ConsoleService } from '../console.service';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  game!: string;
  user!: string;
  subscriptions: Record<string, Subscription> = {};
  messages: string[] = [];
  state = {} as State;
  value = {} as Next;
  conglomerates = [["Cathy", "Cash Back Cathy (Food)"], ["Terry", "One-Time Terry  (Real Estate)"],
    ["Gary", "Goodwill Gary (Tech)"], ["Doug", "Doug Dividends (Recreation)"]];
  cart: CartItem[] = [];
  /** One Subject for each field of State, to alert a component that a change has occurred */
  stateSubjects: Record<string, Subject<void>> = {
    cmd: new Subject<void>(),
    users: new Subject<void>(),
    price: new Subject<void>(),
    delta: new Subject<void>(),
    pw: new Subject<void>(),
    round: new Subject<void>(),
    user: new Subject<void>(),
    ready: new Subject<void>(),
    pledge: new Subject<void>(),
    "can-trade": new Subject<void>(),
    pa: new Subject<void>(),
    cash: new Subject<void>(),
    init: new Subject<void>(),
    "second-init": new Subject<void>(),
    ver: new Subject<void>()
  };
  /** Subjects for non-State properties */
  localSubjects: Record<string, Subject<void>> = {
    "cart-add": new Subject<void>(),
    "cart-remove": new Subject<void>()
  };
  timers: Record<string, NodeJS.Timer> = {};
  constructor(private title: Title, private websocket: WebSocketService,
    private console: ConsoleService) { }
  ngOnInit(): void {
    // lastGame is guaranteed to be non-null, because it was set in storage immediately before routing here
    const lastGame = localStorage.getItem("lastGame")!;
    [this.game, this.user] = JSON.parse(lastGame);
    this.title.setTitle(`Game ${this.game} | Eggonomics`);
    const next = (value: WebSocketMessage) => this.next(JSON.parse(value as string));
    const cartStorage = localStorage.getItem(`game:${this.game}:user:${this.user}:cart`);
    if (cartStorage)
      this.cart = JSON.parse(cartStorage);
    else
      localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, "[]");
    this.subscriptions["alive"] = this.websocket.aliveSubject.subscribe(alive => {
      if (alive) {
        this.websocket.nextJ({ cmd: Cmd.Load, game: this.game, user: this.user });
      } else {
        this.next({ cmd: Cmd.Disconnect, err: "ENOWSS", why: "WebSocket connection closed; reload page to reopen." });
      }
    });
    this.subscriptions["websocket"] = this.websocket.subscribe({ next });
  }
  ngOnDestroy() {
    if (this.subscriptions["websocket"])
      this.subscriptions["websocket"].unsubscribe();
    if (this.subscriptions["alive"])
      this.subscriptions["alive"].unsubscribe();
  }
  private next(value: Next) {
    this.console.log(value);
    this.messages.length = 0;
    this.value = value;
    if (value.err && value.why) {
      // Display error message to user
      this.messages.push(`cmd: ${value.cmd}`, value.err, value.why);
      if (value.proof)
        this.messages.push(JSON.stringify(value.proof));
      return;
    }
    switch (value.cmd) {
      case Cmd.Load: {
        // Set initial state of game
        this.state = value as State;
        break;
      }
      case Cmd.Update: {
        // Set changes to game state
        this.update(value as PartialState, this.state, 0);
        // Alert relevant components of the changes
        for (const key of Object.keys(value))
          this.stateSubjects[key].next();
        break;
      }
      case Cmd.Reload: {
        // Reload the page
        this.reloadPage();
        break;
      }
      case Cmd.Disconnect: {
        // Alert user of disconnect
        this.next({ cmd: Cmd.Disconnect, err: "EDC", why: (value as Disconnect).reason });
        break;
      }
      default: {
        // Error on unknown command
        this.next({ cmd: value.cmd, err: "ENOCMD", why: "Invalid or unexpected command" });
        break;
      }
    }
  }
  reloadPage() {
    window.location.reload();
  }
  addUser() {
    this.websocket.nextJ({ cmd: Cmd.AddUser, game: this.game, user: this.user });
  }
  /**
   * Walk through state and apply changes where applicable
   * @param {PartialState} partial One part of the frame update
   * @param {any} parent A reference to the parent object
   * @returns {boolean} Whether or not the parent object must be deleted (in case it's empty)
   */
  update(partial: PartialState, parent: any, depth: number) {
    if (typeof partial === "object" && Object.keys(partial).length === 0) {
      // partial is an empty object, so replace parent with it (regardless of type)
      return true;
    }
    for (const [key, value] of Object.entries(partial)) {
      if (key === "cmd") {
        // Skip key, since it's not part of the state
        continue;
      } else if (Number(key) >= 0) {
        // partial is a set, so replace all members
        parent.length = 0;
        parent.push(...(partial as any));
        break;
      } else if (typeof value === "string" || typeof value === "number") {
        // partial is a hash, so replace the specific fields
        parent[key] = value;
      } else if (typeof value === "object") {
        // partial is an object (hash or set), so repeat
        const toDelete = this.update(value, parent[key], depth + 1);
        if (toDelete) {
          delete parent[key];
          parent[key] = value;
        }
      }
    }
    return false;
  }
  addCartItem($event: CartItem) {
    const sameItemIndex = this.cart
      .findIndex(item => item.tx === $event.tx && item.con === $event.con && item.com === $event.com);
    if (sameItemIndex < 0) {
      // No same item in cart
      this.cart.push($event);
    } else {
      // There is a similar item in cart, so replace it
      $event.ct += this.cart[sameItemIndex].ct;
      this.cart.splice(sameItemIndex, 1);
      if ($event.ct)
        this.cart.push($event);
    }
    this.localSubjects["cart-add"].next();
    localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, JSON.stringify(this.cart));
  }
  removeItem() {
    this.localSubjects["cart-remove"].next();
    localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, JSON.stringify(this.cart));
  }
  raisePublicWork($event: [string, number]) {
    this.console.log("stock", $event[0], "pw", $event[1]);
    this.websocket.nextJ({ cmd: Cmd.Raise, game: this.game, user: this.user, stock: $event[0], flavor: $event[1] });
  }
  ready($event: boolean) {
    this.console.log(`user ${this.user} ready: ${$event}`);
    this.websocket.nextJ({
      cmd: Cmd.Ready, game: this.game, user: this.user, ready: $event,
      phase: this.state.round.phase
    });
  }
  reportPledge($event: number) {
    this.console.log(`user ${this.user} pledge ${$event}`);
    this.websocket.nextJ({ cmd: Cmd.Pledge, game: this.game, user: this.user, pledge: $event });
  }
  debug($event: PartialState) {
    this.console.log("debug", $event);
    $event["cmd"] = Cmd.Debug;
    $event["game"] = this.game;
    this.websocket.nextJ($event);
  }
  breakStuff() {
    this.websocket.nextJ({ cmd: "patch", game: "0".repeat(14), ver: 0 });
  }
  patch() {
    this.websocket.nextJ({ cmd: Cmd.Patch, game: this.game, ver: this.state.ver });
  }
  changeMember($event: string) {
    this.console.log("user", this.user, "| stock", $event, "| newTier",
      this.state.user[this.user].member[$event] + 1);
    this.websocket.nextJ({ cmd: Cmd.Member, game: this.game, user: this.user, stock: $event });
  }
}
