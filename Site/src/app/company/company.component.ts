import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})
export class CompanyComponent implements OnInit, OnChanges {
  @Input() conglomerate!: string;
  @Input() company!: string;
  @Input() state!: State;
  deltaPercent!: number;
  deltaEmoji!: string;
  available!: number;
  @Input() user!: string;
  buyOrSellButton = "Add to cart";
  purchaseForm = new FormGroup({
    amount: new FormControl(0)
  });
  @Input() description!: string;
  tradeOfferForm = new FormGroup({
    tx: new FormControl(this.user),
    amount: new FormControl(0)
  });
  constructor() { }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"].currentValue.delta) {
      this.deltaPercent = this.state.delta[this.conglomerate + ':' + this.company]
        / this.state.price[this.conglomerate + ':' + this.company];
      this.deltaEmoji = this.state.delta[this.conglomerate + ':' + this.company] < 0 ? "\u{1F4C9}" : "\u{1F4C8}";
    }
    if (changes["state"].currentValue.user) {
      let sum = 100;
      this.state.users.forEach((user) => {
        sum -= this.state.user[user].own[this.conglomerate + ':' + this.company];
      });
      this.available = sum;
    }
  }
  ngOnInit(): void {

  }
  addToCart() {
    console.log(`addToCart ${this.conglomerate + ':' + this.company} amount:`,
      this.purchaseForm.controls["amount"].value);
    this.purchaseForm.reset({ amount: 0 });
    this.buyOrSellButton = "Add to cart";
  }
  tradeOffer() {
    console.log("tradeOffer", this.conglomerate + ':' + this.company,
      `tx: ${this.tradeOfferForm.controls["tx"].value};`,
      `amount: ${this.tradeOfferForm.controls["amount"].value}`);
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
      <= this.state.user[this.tradeOfferForm.controls['tx'].value].own[this.conglomerate + ':' + this.company]
      && this.tradeOfferForm.controls["amount"].value + increase >= 0)
        this.tradeOfferForm.controls["amount"].setValue(this.tradeOfferForm.controls["amount"].value + increase);
  }
}