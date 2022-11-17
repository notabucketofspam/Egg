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
  errorMessages: string[] = [];
  state = {} as State;
  value = {} as Next;
  connected = true;
  conglomerates = [["Cathy", "Cash Back Cathy (Food)"], ["Terry", "One-Time Terry  (Real Estate)"],
    ["Gary", "Goodwill Gary (Tech)"], ["Doug", "Doug Dividends (Recreation)"]];
  cart: CartItem[] = [];
  cartSubject = new Subject<string>();
  cartTotal = 0;
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
      this.errorMessages.push(`cmd: ${value.cmd}`, value.err, value.why!, JSON.stringify(value.proof));
      return;
    } else {
      this.errorMessages.length = 0;
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
        this.errorMessages.push(`cmd: ${error.cmd}`, error.err, error.why);
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
    localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, JSON.stringify(this.cart));
    this.setCartTotal();
  }
  removeItem($event: string) {
    //console.log("cartEvent", $event);
    this.cartSubject.next($event);
    localStorage.setItem(`game:${this.game}:user:${this.user}:cart`, JSON.stringify(this.cart));
    this.setCartTotal();
  }
  raisePublicWork($event: [string, number]) {
    console.log("stock", $event[0], "pw", $event[1]);
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
}
