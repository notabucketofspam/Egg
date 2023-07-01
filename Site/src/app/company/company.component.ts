import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';
import { ConsoleService } from '../console.service';
import { TimeService } from '../time.service';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})
export class CompanyComponent implements OnInit, OnDestroy, OnChanges {
  @Input() conglomerate!: string;
  @Input() company!: string;
  @Input() state!: State;
  deltaPercent!: number;
  deltaEmoji!: string;
  available = 0;
  @Input() user!: string;
  buyOrSellButton = "Add to cart";
  @Output() cartActionEE = new EventEmitter<CartItem>();
  @Input() description!: string;
  tradeOfferForm = new FormGroup({
    tx: new FormControl(this.user),
    amount: new FormControl(0)
  });
  @Input() cart!: CartItem[];
  @Input() acceptedOffers!: CartItem[];
  @Input() localSubjects!: Record<string, Subject<void>>;
  private subscriptions: Record<string, Subscription> = {};
  withdraw = {
    user: {} as Projected["user"],
    available: 0
  }
  projected = {
    user: {} as Projected["user"],
    available: 0
  }
  comShort!: string;
  titleBlockClass = "TrueNeutral";
  flavorClasses = [
    "TrueNeutral",
    "MostExcellent",
    "Good",
    "Bad",
    "DogWater"
  ];
  flavorIcons = [
    "\u{26AA}",
    "\u{1F451}",
    "\u{1F618}",
    "\u{1F4A2}",
    "\u{1F52B}"
  ];
  @Input() stateSubjects!: Record<string, Subject<void>>;
  private destroyer = new ReplaySubject<boolean>(1);
  /** The Projected that the rest of the game can access (no 'available' property) */
  @Input() projected2!: Projected;
  constructor(private time: TimeService, private console: ConsoleService) { }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue.delta) {
        this.resetDelta();
      }
      if (changes["state"].currentValue.user) {
        this.available = 100;
        this.state.users.forEach((user) => {
          this.available -= this.state.user[user].own[this.comShort];
          if (!this.withdraw.user[user]) {
            this.withdraw.user[user] = {
              own: {}
            };
            Object.keys(this.state.user[user].own).forEach((com) => {
              if (com === this.comShort)
                this.withdraw.user[user].own[this.comShort] = 0;
            });
          }
          if (!this.projected2.user[user]) {
            this.projected2.user[user] = {
              own: {}
            };
          }
          if (!this.projected.user[user]) {
            this.projected.user[user] = {
              own: this.projected2.user[user].own
            };
            Object.keys(this.state.user[user].own).forEach((com) => {
              if (com === this.comShort)
                this.projected.user[user].own[this.comShort]
                  = this.state.user[user].own[this.comShort];
            });
          }
        });
        if (this.state.round && this.state.round.phase === 3)
          this.resetFromLocal(this.acceptedOffers);
        else
          this.resetFromLocal(this.cart);
      }
      if (changes["state"].currentValue.pw) {
        this.titleBlockClass = this.flavorClasses[this.state.pw[this.comShort]];
      }
    }
  }
  resetFromLocal(itemArray: CartItem[]) {
    if (this.state.users) {
      this.state.users.forEach(user => {
        this.withdraw.user[user].own[this.comShort] = 0;
      });
      this.withdraw.available = 0;
      itemArray.forEach(item => {
        if (item.com === this.company) {
          if (item.tx)
            this.withdraw.user[item.tx].own[this.comShort] = item.ct;
          else
            this.withdraw.available = item.ct;
          this.withdraw.user[item.rx].own[this.comShort] = -item.ct;
        }
      });
      this.resetProjected();
    }
  }
  ngOnInit(): void {
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.resetFromLocal(this.cart));
    this.subscriptions["accepted-offers"] = this.localSubjects["accepted-offers"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.resetFromLocal(this.acceptedOffers));
    this.comShort = this.conglomerate + ':' + this.company;
    this.tradeOfferForm.controls["tx"].setValue(this.user);
    this.subscriptions["delta"] = this.stateSubjects["delta"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetDelta();
    });
    this.subscriptions["user"] = this.stateSubjects["user"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetProjected();
      this.resetAvailable();
      this.resetProjected();
    });
  }
  resetProjected() {
    if (this.state.users && this.state.user) {
      this.projected.available = this.available - this.withdraw.available;
      this.state.users.forEach(user => {
        this.projected.user[user].own[this.comShort] = this.state.user[user].own[this.comShort]
          - this.withdraw.user[user].own[this.comShort];
      });
    }
  }
  ngOnDestroy(): void {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  resetAvailable() {
    if (this.state.users && this.state.user) {
      this.available = 100;
      this.state.users.forEach(user => {
        this.available -= this.state.user[user].own[this.comShort];
      });
    }
  }
  resetDelta() {
    this.deltaPercent = this.state.delta[this.comShort]
      / this.state.price[this.comShort];
    this.deltaEmoji = this.state.delta[this.comShort] < 0 ? "\u{1F4C9}" : "\u{1F4C8}";
  }
  tradeOffer() {
    if (!this.state["can-trade"].includes(this.user)) {
      //alert("You are not on the list of users that can trade! Next time, don't fail your pledge!");
      return;
    }
    if (this.state.round.phase === 3) {
      return;
    }
    const tx = this.tradeOfferForm.controls["tx"].value;
    const amount = this.tradeOfferForm.controls["amount"].value;
    if (amount !== null) {
      const item: CartItem = {
        id: this.time.gen(),
        rx: this.user,
        con: this.conglomerate,
        com: this.company,
        ct: amount
      };
      if (this.state.price) {
        const tradeTotal = this.state.price[this.comShort] * amount;
        if (this.projected2.cash[this.user] && this.projected2.cash[this.user] < tradeTotal) {
          //alert("You cannot afford this many stocks!");
          return;
        }
      }
      if (tx !== null) {
        item.tx = tx;
        this.withdraw.user[tx].own[this.comShort] += amount;
        this.projected.user[tx].own[this.comShort] = this.state.user[tx].own[this.comShort]
          - this.withdraw.user[tx].own[this.comShort];
        this.projected.user[this.user].own[this.comShort] += amount;
      } else {
        this.withdraw.available += amount;
        this.projected.available = this.available - this.withdraw.available;
        this.projected.user[this.user].own[this.comShort] += amount;
      }
      this.cartActionEE.emit(item);
      this.tradeOfferForm.reset({ tx: this.user, amount: 0 });
    }
  }
  increaseTradeOfferAmount(increase: number) {
    const amount = this.tradeOfferForm.controls["amount"].value;
    const tx = this.tradeOfferForm.controls['tx'].value;
    if (amount !== null && tx !== this.user) {
      // Non-self user selected and amount exists
      if (this.projected2.cash[this.user] !== undefined
        && this.projected2.cash[this.user] < (amount + increase)*this.state.price[this.comShort]) {
        // User cannot afford this many stocks
        // Do nothing
      } else if (tx === null) {
        // User has selected "The Market"
        if (amount + increase <= this.projected.available
          && amount + increase >= -this.projected.user[this.user].own[this.comShort]) {
          this.tradeOfferForm.controls["amount"].setValue(amount + increase);
        }
      } else {
        // User has selected another user
        if (amount + increase <= this.projected.user[tx].own[this.comShort] && amount + increase >= 0) {
          this.tradeOfferForm.controls["amount"].setValue(amount + increase);
        }
      }
    }
  }
}
