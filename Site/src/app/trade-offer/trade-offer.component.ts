import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-trade-offer',
  templateUrl: './trade-offer.component.html',
  styleUrls: ['./trade-offer.component.css']
})
/** The vast majority of this class is (uncoincidentally) copy-paste from CartComponent */
export class TradeOfferComponent implements OnChanges, OnInit, OnDestroy {
  @Input() user!: string;
  @Input() state!: State;
  @Input() acceptedOffers!: CartItem[];
  @Output() offerEE = new EventEmitter<void>();
  profitTotal = 0;
  destroyer = new ReplaySubject<boolean>(1);
  subscriptions: Record<string, Subscription> = {};
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  constructor() { }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue["round"]) {
        this.checkAcceptedOffers();
      }
    }
    if (changes["acceptedOffers"]) {
      this.setProfitTotal();
    }
  }
  ngOnInit(): void {
    this.subscriptions["round"] = this.stateSubjects["round"].pipe(takeUntil(this.destroyer))
      .subscribe(() => this.checkAcceptedOffers());
  }
  ngOnDestroy(): void {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  setProfitTotal() {
    if (this.state && this.state.price) {
      this.profitTotal = 0;
      this.acceptedOffers.forEach(item => {
        this.profitTotal += item.ct * this.state.price[item.con+':'+item.com];
      });
    }
  }
  modifyItem(index: number) {
    if (this.state.ready.includes(this.user) && this.state.round.phase === 3) {
      alert("Locked in! Can't modify your accepted offers once ready; must un-ready to make changes.");
    } else {

    }
  }
  checkAcceptedOffers() {
    if (this.state.round && this.state.round.phase === 4) {
      // Clear acceptedOffers after the second trading window is complete
      this.acceptedOffers.length = 0;
      this.offerEE.emit();
    }
  }
}
