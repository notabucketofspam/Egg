import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() cart!: CartItem[];
  @Output() cartEE = new EventEmitter<string>();
  cartTotal = 0;
  @Input() state!: State;
  subscriptions: Record<string, Subscription> = {};
  @Input() localSubjects!: Record<string, Subject<void>>;
  constructor() { }
  ngOnDestroy(): void {
    if (this.subscriptions["cart-add"])
      this.subscriptions["cart-add"].unsubscribe();
    if (this.subscriptions["cart-remove"])
      this.subscriptions["cart-remove"].unsubscribe();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["cart"]) {
      this.setCartTotal();
    }
  }
  ngOnInit(): void {
    this.subscriptions["cart-add"] = this.localSubjects["cart-add"].subscribe(() => this.setCartTotal());
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].subscribe(() => this.setCartTotal());
  }
  removeItem(index: number) {
    this.cart.splice(index, 1);
    this.cartEE.emit();
  }
  setCartTotal() {
    if (this.state && this.state.price) {
      this.cartTotal = 0;
      this.cart.forEach(item => {
        this.cartTotal += item.ct * this.state.price[item.con + ':' + item.com];
      });
    }
  }
}
