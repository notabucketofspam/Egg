import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
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
  available!: number;
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
  @Input() cartSubject!: Subject<string>;
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
  constructor(private time: TimeService) { }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue.delta) {
        this.deltaPercent = this.state.delta[this.comShort]
          / this.state.price[this.conglomerate + ':' + this.company];
        this.deltaEmoji = this.state.delta[this.comShort] < 0 ? "\u{1F4C9}" : "\u{1F4C8}";
      }
      if (changes["state"].currentValue.user) {
        this.available = 100;
        this.state.users.forEach((user) => {
          this.available -= this.state.user[user].own[this.comShort];
          if (!this.withdraw.user[user]) {
            this.withdraw.user[user] = {
              own: {},
              member: {}
            };
            Object.keys(this.state.user[user].own).forEach((com) => {
              if (com === this.comShort)
                this.withdraw.user[user].own[this.comShort] = 0;
            });
          }
          if (!this.projected.user[user]) {
            this.projected.user[user] = {
              own: {},
              member: {}
            };
            Object.keys(this.state.user[user].own).forEach((com) => {
              if (com === this.comShort)
                this.projected.user[user].own[this.comShort]
                  = this.state.user[user].own[this.comShort];
            });
          }
        });
      }
    }
  }
  ngOnInit(): void {
    this.subscriptions["cart"] = this.cartSubject.subscribe(value => {
      this.cart.forEach(item => {
        if (item.com === this.company) {
          //console.log("ITEM", item.con + ":" + item.com, value, item.ct);
          if (item.tx)
            this.withdraw.user[item.tx].own[item.con + ":" + item.com] = item.ct;
          else
            this.withdraw.available = item.ct;
        }
      });
      this.projected.available = this.available - this.withdraw.available;
      this.state.users.forEach(user => {
        this.projected.user[user].own[this.comShort] = this.state.user[user].own[this.comShort]
          - this.withdraw.user[user].own[this.comShort];
        //console.log(this.comShort, user, "state", this.state.user[user].own[this.comShort],
        //  "withdraw", this.withdraw.user[user].own[this.comShort],
        //  "projected", this.projected.user[user].own[this.comShort],
        //  "available", this.available,
        //  "withdraw", this.withdraw.available,
        //  "projected", this.projected.available);
      });
    });
    this.comShort = this.conglomerate + ':' + this.company;
  }
  ngOnDestroy(): void {
    if (this.subscriptions["cart"])
      this.subscriptions["cart"].unsubscribe();
  }
  addToCart() {
    this.cartActionEE.emit({
      key: this.time.gen(),
      rx: this.user,
      con: this.conglomerate,
      com: this.company,
      ct: this.purchaseForm.controls["amount"].value!
    });
    this.withdraw.available += this.purchaseForm.controls["amount"].value!;
    this.projected.available = this.available - this.withdraw.available;
    //console.log(this.conglomerate + ':' + this.company, "available", this.projected.available);
    this.purchaseForm.reset({ amount: 0 });
    this.buyOrSellButton = "Add to cart";
  }
  tradeOffer() {
    this.cartActionEE.emit({
      key: this.time.gen(),
      tx: this.tradeOfferForm.controls["tx"].value!,
      rx: this.user,
      con: this.conglomerate,
      com: this.company,
      ct: this.tradeOfferForm.controls["amount"].value!
    });
    const tx = this.tradeOfferForm.controls["tx"].value!;
    const amount = this.tradeOfferForm.controls["amount"].value!;
    const com = this.conglomerate + ':' + this.company;
    //console.log(tx, amount, com);
    this.withdraw.user[tx].own[com] += amount;
    this.projected.user[tx].own[com] = this.state.user[tx].own[com] - this.withdraw.user[tx].own[com];
    this.tradeOfferForm.reset({ tx: this.user, amount: 0 });
  }
  increaseAmount(increase: number) {
    if (this.purchaseForm.controls["amount"].value !== null) {
      if (this.purchaseForm.controls["amount"].value + increase
        >= -this.state.user[this.user].own[this.conglomerate + ':' + this.company]
        && this.purchaseForm.controls["amount"].value + increase <= this.available)
        this.purchaseForm.controls["amount"].setValue(this.purchaseForm.controls["amount"].value + increase);
      this.buyOrSellButton = this.purchaseForm.controls["amount"].value >= 0 ? "Add to cart" : "Sell off stocks";
    }
  }
  increaseTradeOfferAmount(increase: number) {
    if (this.tradeOfferForm.controls['amount'].value !== null
      && this.tradeOfferForm.controls['tx'].value !== null
      && this.tradeOfferForm.controls['tx'].value !== this.user
      && this.tradeOfferForm.controls["amount"].value + increase
      <= this.state.user[this.tradeOfferForm.controls['tx'].value].own[this.comShort]
      && this.tradeOfferForm.controls["amount"].value + increase >= 0)
        this.tradeOfferForm.controls["amount"].setValue(this.tradeOfferForm.controls["amount"].value + increase);
  }
}
