import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
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
  connected = true;
  conglomerates = [["Cathy", "Cash Back Cathy (Food)"], ["Terry", "One-Time Terry  (Real Estate)"],
    ["Gary", "Goodwill Gary (Tech)"], ["Doug", "Doug Dividends (Recreation)"]];
  cart: CartItem[] = [];
  cartTotal = 0;
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
  constructor(private route: ActivatedRoute, private title: Title,
    private websocket: WebSocketService) { }
  ngOnInit(): void {
    this.subscriptions["route"] = this.route.params.subscribe(params => {
      this.game = params['game'];
      this.user = params["user"];
      this.title.setTitle(`Game ${this.game} | Eggonomics`);
      this.subscriptions["websocket"] = this.websocket.subscribe({
        next: value => this.next(JSON.parse(value as string))
      });
      this.websocket.nextJ({ cmd: Cmd.Load, game: this.game, user: this.user });
    });
    const cartStorage = localStorage.getItem(`game:${this.game}:user:${this.user}:cart`);
    if (cartStorage)
      this.cart = JSON.parse(cartStorage);
    else
      localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, "[]");
  }
  ngOnDestroy() {
    if (this.subscriptions["websocket"])
      this.subscriptions["websocket"].unsubscribe();
    if (this.subscriptions["route"])
      this.subscriptions["route"].unsubscribe();
  }
  private next(value: Next) {
    this.value = value;
    if (value.err) {
      console.log(value);
      this.messages.push(`cmd: ${value.cmd}`, value.err, value.why!, JSON.stringify(value.proof));
      return;
    } else {
      this.messages.length = 0;
    }
    switch (value.cmd) {
      case Cmd.Load: {
        // Set initial state of game
        console.log(value);
        this.load(value as State);
        break;
      }
      case Cmd.Update: {
        // Set changes to game state
        console.log(value);
        this.update(value as PartialState, this.state, 0);
        // Alert relevant components of the changes
        for (const key of Object.keys(value))
          this.stateSubjects[key].next();
        break;
      }
      case Cmd.RemoveUser:
      case Cmd.AddUser: {
        console.log(value);
        this.websocket.nextJ({ cmd: Cmd.Load, game: this.game, user: this.user });
        break;
      }
      case Cmd.Disconnect: {
        console.log(value);
        this.clear();
        this.messages.push(`cmd: ${value.cmd}`, (value as Disconnect).reason);
        this.connected = false;
        break;
      }
      default: {
        const error = { cmd: value.cmd, err: "ENOCMD", why: "Invalid or unexpected command" };
        console.log(error);
        this.messages.length = 0;
        this.messages.push(`cmd: ${error.cmd}`, error.err, error.why);
        break;
      }
    }
  }
  addUser() {
    this.websocket.nextJ({ cmd: Cmd.AddUser, game: this.game, user: this.user });
  }
  clear() {
    this.state = {} as State;
  }
  load(state: State) {
    this.state = state as State;
    this.setCartTotal();
    //console.log(this.cart);
  }
  /**
   * Walk through state and apply changes where applicable
   * @param {PartialState} partial One part of the frame update
   * @param {any} parent A reference to the parent object
   * @returns {boolean} Whether or not the parent object must be deleted (in case it's empty)
   */
  update(partial: PartialState, parent: any, depth: number) {
    //console.log("depth", depth, "partial", partial, "parent", parent);
    if (typeof partial === "object" && Object.keys(partial).length === 0) {
      // partial is an empty object, so replace parent with it (regardless of type)
      //parent = partial;
      //console.log("empty partial", partial, "new parent", parent);
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
        //console.log("set", "depth", depth, "key", key, "new parent", parent);
        break;
      } else if (typeof value === "string" || typeof value === "number") {
        // partial is a hash, so replace the specific fields
        parent[key] = value;
        //console.log("hash", "depth", depth, "key", key, "parent after", parent);
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
    //console.log($event);
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
    this.setCartTotal();
  }
  removeItem($event: string) {
    this.localSubjects["cart-remove"].next();
    localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, JSON.stringify(this.cart));
    this.setCartTotal();
  }
  raisePublicWork($event: [string, number]) {
    console.log("stock", $event[0], "pw", $event[1]);
    this.websocket.nextJ({ cmd: Cmd.Raise, game: this.game, user: this.user, stock: $event[0], flavor: $event[1] });
  }
  setCartTotal() {
    this.cartTotal = 0;
    this.cart.forEach(item => {
      this.cartTotal += item.ct * this.state.price[item.con+':'+item.com];
    });
  }
  ready($event: boolean) {
    console.log(`user ${this.user} ready: ${$event}`);
    this.websocket.nextJ({ cmd: Cmd.Ready, game: this.game, user: this.user, ready: $event });
  }
  reportPledge($event: number) {
    console.log(`user ${this.user} pledge ${$event}`);
    this.websocket.nextJ({ cmd: Cmd.Pledge, game: this.game, user: this.user, pledge: $event });
  }
  debug($event: PartialState) {
    console.log("debug", $event);
    $event["cmd"] = Cmd.Debug;
    $event["game"] = this.game;
    this.websocket.nextJ($event);
  }
  breakStuff() {
    this.websocket.nextJ({ cmd: "patch", game: "0".repeat(14), ver: 0, users: this.state.users });
  }
  patch() {
    this.websocket.nextJ({ cmd: Cmd.Patch, game: this.game, ver: this.state.ver, users: this.state.users });
  }
  changeMember($event: string) {
    console.log("user", this.user, "| stock", $event, "| newTier", this.state.user[this.user].member[$event] + 1);
    this.websocket.nextJ({ cmd: Cmd.Member, game: this.game, user: this.user, stock: $event });
  }
}
