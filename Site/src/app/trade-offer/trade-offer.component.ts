import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-trade-offer',
  templateUrl: './trade-offer.component.html',
  styleUrls: ['./trade-offer.component.css']
})
  /** The vast majority of this class is (uncoincidentally) copy-paste from CartComponent */
  /** Voila! They are merged. */
export class TradeOfferComponent implements OnChanges, OnInit, OnDestroy {
  @Input() state = {} as State;
  @Input() user!: string;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() cart!: CartItem[];
  @Output() cartEE = new EventEmitter<void>();
  @Input() acceptedOffers!: CartItem[];
  acceptedOffersIds: string[] = [];
  @Output() offerEE = new EventEmitter<void>();
  profitTotal = 0;
  cartTotal = 0;
  subscriptions: Record<string, Subscription> = {};
  destroyer = new ReplaySubject<boolean>(1);

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue["round"]) {
        this.checkCart();
        this.checkAcceptedOffers();
      }
      if (changes["state"].currentValue["price"]) {
        this.setCartTotal();
        this.setProfitTotal();
      }
      if (changes["state"].currentValue["user"] && this.acceptedOffers.length > 0)
        this.setAcceptedOffersIds();
    }
    if (changes["cart"]) {
      this.setCartTotal();
    }
    if (changes["acceptedOffers"]) {
      this.setProfitTotal();
    }
  }
  ngOnInit(): void {
    this.subscriptions["round"] = this.stateSubjects["round"].pipe(takeUntil(this.destroyer))
      .subscribe(() => {
        this.checkCart();
        this.checkAcceptedOffers();
      });
    this.subscriptions["cart-add"] = this.localSubjects["cart-add"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.setCartTotal());
    this.subscriptions["cart-remove"] = this.localSubjects["cart-remove"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.setCartTotal());
  }
  ngOnDestroy(): void {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  setAcceptedOffersIds() {
    if (this.state.user) {
      this.acceptedOffersIds = this.acceptedOffers.map(item => item.id);
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
  setProfitTotal() {
    if (this.state.price) {
      this.profitTotal = 0;
      this.acceptedOffers.forEach(item => {
        this.profitTotal += item.ct * this.state.price[item.con + ':' + item.com];
      });
    }
  }
  removeItem(index: number) {
    if (this.state.ready.includes(this.user) && this.state.round.phase === 2) {
      //alert("Locked in! Can't modify the cart once ready; must un-ready to make changes.");
    } else {
      this.cart.splice(index, 1);
      this.cartEE.emit();
    }
  }
  modifyItem(index: number) {
    if (!this.state["can-trade"].includes(this.user)) {
      //alert("You are not on the list of users that can trade! Next time, don't fail your pledge!");
      return;
    }
    if (this.state.ready.includes(this.user) && this.state.round.phase === 3) {
      //alert("Locked in! Can't modify your accepted offers once ready; must un-ready to make changes.");
    } else {
      const targetItem = this.state.user[this.user].offers[index];
      const hasTargetItem = this.acceptedOffers.find(item => item.id === targetItem.id);
      if (hasTargetItem) {
        this.acceptedOffers.splice(index, 1);
        this.acceptedOffersIds.splice(index, 1);
      } else {
        this.acceptedOffers.push(targetItem);
        this.acceptedOffersIds.push(targetItem.id);
      }
      this.setProfitTotal();
      this.offerEE.emit()
    }
  }
  checkCart() {
    if (this.state.round && this.state.round.phase === 3 && this.cart.length > 0) {
      // Clear the cart after the first trading window is complete
      this.cart.length = 0;
      this.cartEE.emit();
    }
  }
  checkAcceptedOffers() {
    if (this.state.round && this.state.round.phase === 4
      && this.acceptedOffers.length > 0 && this.acceptedOffersIds.length > 0) {
      // Clear acceptedOffers after the second trading window is complete
      this.acceptedOffers.length = 0;
      this.acceptedOffersIds.length = 0;
      this.offerEE.emit();
    }
  }
}
