import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-cash',
  templateUrl: './cash.component.html',
  styleUrls: ['./cash.component.css'],
  providers: [CurrencyPipe]
})
export class CashComponent implements OnInit, OnChanges, OnDestroy {
  @Output() reportEE = new EventEmitter<number>();
  reportForm = new FormGroup({
    amount: new FormControl(0)
  });
  @Input() cart!: CartItem[];
  @Input() acceptedOffers!: CartItem[];
  @Input() projected!: Projected;
  paTotal = 0;
  @Input() user!: string;
  subscriptions: Record<string, Subscription> = {};
  @Input() stateSubjects!: Record<string, Subject<void>>;
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() state!: State;
  destroyer = new ReplaySubject<boolean>(1);
  portfolio: State["cash"] = {};
  tooltipOptions: TooltipOption[] = [];
  reload = true;
  currencyPipe: CurrencyPipe
  constructor(currencyPipe: CurrencyPipe) {
    this.currencyPipe = currencyPipe;
  }
  ngOnInit(): void {
    this.subscriptions["cash"] = this.stateSubjects["cash"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetProjectedCash();
    });
    this.subscriptions["pa"] = this.stateSubjects["pa"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      if (this.state.users && this.state.pa) {
        this.resetPaTotal();
      }
    });
    this.subscriptions["accepted-offers"] = this.localSubjects["accepted-offers"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.resetProjectedCash());
    this.subscriptions["cart-add"] = this.localSubjects["cart-add"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.resetProjectedCash());
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.resetProjectedCash());
    this.subscriptions["pledge"] = this.stateSubjects["pledge"].pipe(takeUntil(this.destroyer))
      .subscribe(() => {
      this.resetProjectedCash();
      });
    this.subscriptions["user"] = this.stateSubjects["user"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.resetPortfolio());
  }
  resetPaTotal() {
    this.paTotal = 0;
    for (const username of this.state.users) {
      this.paTotal += this.state.pa[username];
    }
  }
  resetProjectedCash() {
    if (this.state.users) {
      this.state.users.forEach(username => this.projected.cash[username] = this.state.cash[username]);
      for (const item of this.cart) {
        if (item.tx)
          this.projected.cash[item.tx] += item.ct * this.state.price[item.con + ':' + item.com];
        this.projected.cash[this.user] -= item.ct * this.state.price[item.con + ':' + item.com];
      }
      for (const item of this.acceptedOffers) {
        this.projected.cash[this.user] += item.ct * this.state.price[item.con + ':' + item.com];
        this.projected.cash[item.rx] -= item.ct * this.state.price[item.con + ':' + item.com];
      }
      this.projected.cash[this.user] -= this.state.pledge[this.user];
    }
  }
  ngOnDestroy() {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue["cash"]) {
        if (this.state.users) {
          this.resetProjectedCash();
        }
      }
      if (changes["state"].currentValue["pa"]) {
        if (this.state.users) {
          this.resetPaTotal();
        }
      }
      if (changes["state"].currentValue["user"]) {
        if (this.state.users) {
          this.resetPortfolio();
        }
      }
    }
  }
  report() {
    if (this.reportForm.controls["amount"].value !== null) {
      this.reportEE.emit(this.reportForm.controls["amount"].value);
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
  resetPortfolio() {
    if (this.state && this.state.users) {
      this.state.users.forEach(user => {
        this.portfolio[user] = 0;
        for (const [com, value] of Object.entries(this.state.user[user].own)) {
          this.portfolio[user] += this.state.price[com] * value;
        }
        this._reload();
      });
    }
  }
  _reload() {
    setTimeout(() => this.reload = false);
    setTimeout(() => this.reload = true);
  }
}

type TooltipOption = {
  expr: (...args: any[]) => boolean,
  text: string,
  args: any[]
};
