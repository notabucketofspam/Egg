import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-cash',
  templateUrl: './cash.component.html',
  styleUrls: ['./cash.component.css']
})
export class CashComponent implements OnInit, OnChanges, OnDestroy {
  menuOpen = false;
  menuButtonClass = "Closed";
  menuClass = "NoDisplay";
  @Output() reportEE = new EventEmitter<number>();
  reportForm = new FormGroup({
    amount: new FormControl(0)
  });
  @Input() cart!: CartItem[];
  projected = {
    cash: {} as State["cash"],
    paTotal: 0
  };
  paTotal = 0;
  @Input() user!: string;
  subscriptions: Record<string, Subscription> = {};
  @Input() stateSubjects!: Record<string, Subject<void>>;
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() state!: State;
  constructor() { }
  ngOnInit(): void {
    this.subscriptions["cash"] = this.stateSubjects["cash"].subscribe(() => {
      console.log("stateSubjects[\"cash\"]");
    });
    this.subscriptions["pa"] = this.stateSubjects["pa"].subscribe(() => {
      console.log("stateSubjects[\"pa\"]");
      if (this.state.users && this.state.pa) {
        this.paTotal = 0;
        for (const username of this.state.users) {
          this.paTotal += this.state.pa[username];
        }
      }
    });
    this.subscriptions["cart-add"] = this.localSubjects["cart-add"].subscribe(() => this.resetProjectedCash());
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].subscribe(() => this.resetProjectedCash());
  }
  resetProjectedCash() {
    this.state.users.forEach(username => this.projected.cash[username] = this.state.cash[username]);
    for (const item of this.cart) {
      if (item.tx)
        this.projected.cash[item.tx] += item.ct * this.state.price[item.con + ':' + item.com];
      this.projected.cash[this.user] -= item.ct * this.state.price[item.con + ':' + item.com];
    }
  }
  ngOnDestroy() {
    if (this.subscriptions["pa"])
      this.subscriptions["pa"].unsubscribe();
    if (this.subscriptions["cash"])
      this.subscriptions["cash"].unsubscribe();
    if (this.subscriptions["cart-add"])
      this.subscriptions["cart-add"].unsubscribe();
    if (this.subscriptions["cart-remove"])
      this.subscriptions["cart-remove"].unsubscribe();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue["cash"]) {
        if (this.state.users) {
          for (const username of this.state.users) {
            this.projected.cash[username] = changes["state"].currentValue["cash"][username];
          }
          for (const item of this.cart) {
            if (item.tx)
              this.projected.cash[item.tx] += item.ct * this.state.price[item.con + ':' + item.com];
            this.projected.cash[this.user] -= item.ct * this.state.price[item.con + ':' + item.com];
          }
        }
      }
      if (changes["state"].currentValue["pa"]) {
        if (this.state.users) {
          this.paTotal = 0;
          for (const username of this.state.users) {
            this.paTotal += changes["state"].currentValue["pa"][username];
          }
        }
      }
    }
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "Open" : "Closed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  report() {
    if (this.reportForm.controls["amount"].value !== null) {
      this.reportEE.emit(this.reportForm.controls["amount"].value);
      alert(`Cheers, mate! You have pledged \
${this.currencyPipe.transform(this.reportForm.controls["amount"].value)} to the Public Account!`);
    }
    this.reportForm.reset({ amount: 0 });
  }
  addAmount(toAdd: number) {
    if (this.reportForm.controls["amount"].value !== null)
      if (this.reportForm.controls["amount"].value + toAdd >= 0)
        this.reportForm.controls["amount"].setValue(this.reportForm.controls["amount"].value + toAdd);
      else
        this.reportForm.controls["amount"].setValue(0);
  }
}
