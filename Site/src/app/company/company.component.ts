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
  purchaseForm = new FormGroup({
    amount: new FormControl(0)
  });
  @Input() description!: string;
  tradeOfferForm = new FormGroup({
    tx: new FormControl(this.user),
    amount: new FormControl(0)
  });
  @Input() cart!: CartItem[];
  @Input() localSubjects!: Record<string, Subject<void>>;
  private subscriptions: Record<string, Subscription> = {};
  withdraw = {
    user: {} as State["user"],
    available: 0
  }
  projected = {
    user: {} as State["user"],
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
  changeMemberPrice = 0;
  tierPrices = [0, 400, 550, 650, 800];
  @Output() memberEE = new EventEmitter<string>();
  destroyer = new ReplaySubject<boolean>(1);
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
              own: {},
              member: {},
              offers: [],
              "last-member": {},
              "offers-json": []
            };
            Object.keys(this.state.user[user].own).forEach((com) => {
              if (com === this.comShort)
                this.withdraw.user[user].own[this.comShort] = 0;
            });
          }
          if (!this.projected.user[user]) {
            this.projected.user[user] = {
              own: {},
              member: {},
              offers: [],
              "last-member": {},
              "offers-json": []
            };
            Object.keys(this.state.user[user].own).forEach((com) => {
              if (com === this.comShort)
                this.projected.user[user].own[this.comShort]
                  = this.state.user[user].own[this.comShort];
            });
          }
        });
        this.resetProjected();
      }
      if (changes["state"].currentValue.users)
        this.localSubjects["cart-remove"].next();
      if (changes["state"].currentValue.pw) {
        this.titleBlockClass = this.flavorClasses[this.state.pw[this.comShort]];
        this.resetChangeMemberPrice();
      }
    }
  }
  ngOnInit(): void {
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].pipe(takeUntil(this.destroyer))
      .subscribe(() => {
      if (this.state.users) {
        this.state.users.forEach(user => {
          this.withdraw.user[user].own[this.comShort] = 0;
        });
        this.withdraw.available = 0;
        this.cart.forEach(item => {
          if (item.com === this.company) {
            if (item.tx)
              this.withdraw.user[item.tx].own[item.con + ":" + item.com] = item.ct;
            else
              this.withdraw.available = item.ct;
            this.withdraw.user[this.user].own[this.comShort] -= item.ct;
          }
        });
        this.resetProjected();
      }
    });
    this.comShort = this.conglomerate + ':' + this.company;
    this.subscriptions["pw"] = this.stateSubjects["pw"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetChangeMemberPrice();
    });
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
    //if (this.subscriptions["cart-remove"])
    //  this.subscriptions["cart-remove"].unsubscribe();
    //if (this.subscriptions["pw"])
    //  this.subscriptions["pw"].unsubscribe();
    //if (this.subscriptions["delta"])
    //  this.subscriptions["delta"].unsubscribe();
    //if (this.subscriptions["user"])
    //  this.subscriptions["user"].unsubscribe();
  }
  resetAvailable() {
    if (this.state.users && this.state.user) {
      this.available = 100;
      this.state.users.forEach(user => {
        this.available -= this.state.user[user].own[this.comShort];
      });
    }
  }
  resetChangeMemberPrice() {
    if (this.state.pw) {
    this.changeMemberPrice = 0;
      const conSiblings: string[] = Object.keys(this.state.pw)
        .filter(value => this.conglomerate === value.split(":")[0]);
      conSiblings.forEach(con => this.changeMemberPrice += this.tierPrices[this.state.pw[con]]);
    }
  }
  resetDelta() {
    this.deltaPercent = this.state.delta[this.comShort]
      / this.state.price[this.comShort];
    this.deltaEmoji = this.state.delta[this.comShort] < 0 ? "\u{1F4C9}" : "\u{1F4C8}";
  }
  addToCart() {
    this.cartActionEE.emit({
      id: this.time.gen(),
      rx: this.user,
      con: this.conglomerate,
      com: this.company,
      ct: this.purchaseForm.controls["amount"].value!
    });
    const amount = this.purchaseForm.controls["amount"].value!;
    this.withdraw.available += amount;
    this.projected.available = this.available - this.withdraw.available;
    this.projected.user[this.user].own[this.comShort] += amount;
    this.purchaseForm.reset({ amount: 0 });
    this.buyOrSellButton = "Add to cart";
  }
  tradeOffer() {
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
  increaseAmount(increase: number) {
    if (this.purchaseForm.controls["amount"].value !== null) {
      if (this.purchaseForm.controls["amount"].value + increase
        >= -this.projected.user[this.user].own[this.comShort]
        && this.purchaseForm.controls["amount"].value + increase <= this.projected.available)
        this.purchaseForm.controls["amount"].setValue(this.purchaseForm.controls["amount"].value + increase);
      this.buyOrSellButton = this.purchaseForm.controls["amount"].value >= 0 ? "Add to cart" : "Sell off stocks";
    }
  }
  increaseTradeOfferAmount(increase: number) {
    const amount = this.tradeOfferForm.controls["amount"].value;
    const tx = this.tradeOfferForm.controls['tx'].value;
    if (amount !== null && tx !== this.user) {
      // Non-self user selected and amount exists
      if (tx === null) {
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
