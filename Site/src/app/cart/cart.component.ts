import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() cart!: CartItem[];
  @Output() cartEE = new EventEmitter<void>();
  cartTotal = 0;
  @Input() state!: State;
  subscriptions: Record<string, Subscription> = {};
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  destroyer = new ReplaySubject<boolean>(1);
  @Input() user!: string;
  constructor() { }
  ngOnDestroy(): void {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["cart"]) {
      this.setCartTotal();
    }
    if (changes["state"]) {
      if (changes["state"].currentValue["round"]) {
        this.checkCart();
        this.setCartTotal();
      }
    }
  }
  ngOnInit(): void {
    this.subscriptions["cart-add"] = this.localSubjects["cart-add"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.setCartTotal());
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.setCartTotal());
    this.subscriptions["round"] = this.stateSubjects["round"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.checkCart());
  }
  removeItem(index: number) {
    if (this.state.ready.includes(this.user) && this.state.round.phase === 2) {
      alert("Locked in! Can't modify the cart once ready; must un-ready to make changes.");
    } else {
      this.cart.splice(index, 1);
      this.cartEE.emit();
    }
  }
  setCartTotal() {
    if (this.state && this.state.price) {
      this.cartTotal = 0;
      this.cart.forEach(item => {
        this.cartTotal += item.ct * this.state.price[item.con + ':' + item.com];
      });
    }
  }
  checkCart() {
    if (this.state.round && this.state.round.phase === 3) {
      // Clear the cart after the first trading window is complete
      this.cart.length = 0;
      this.cartEE.emit();
    }
  }
}
