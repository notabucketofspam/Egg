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
    // Check if it's less than user owns, more than available, or not an integer
    if (this.purchaseForm.controls["amount"].value!
      < -this.state.user[this.user].own[this.conglomerate + ':' + this.company]
      || this.purchaseForm.controls["amount"].value! > this.available
      || this.purchaseForm.controls["amount"].value! % 1 !== 0) {
      console.log(`Error on ${this.conglomerate + ':' + this.company} amount:`,
        this.purchaseForm.controls["amount"].value);
    } else {
      console.log(`${this.conglomerate + ':' + this.company} amount:`,
        this.purchaseForm.controls["amount"].value);
      this.purchaseForm.reset({ amount: 0 });
      this.buyOrSellButton = "Add to cart";
    }
  }
  increaseAmount(increase: number) {
    if (this.purchaseForm.controls["amount"].value! + increase
      >= -this.state.user[this.user].own[this.conglomerate + ':' + this.company]
      && this.purchaseForm.controls["amount"].value! + increase <= this.available)
      this.purchaseForm.controls["amount"].setValue(this.purchaseForm.controls["amount"].value! + increase);
      this.buyOrSellButton = this.purchaseForm.controls["amount"].value! >= 0 ? "Add to cart" : "Sell off stocks";
  }
}
