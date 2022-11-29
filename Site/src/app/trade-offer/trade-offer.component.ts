import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-trade-offer',
  templateUrl: './trade-offer.component.html',
  styleUrls: ['./trade-offer.component.css']
})
export class TradeOfferComponent implements OnChanges {
  @Input() state!: State;
  constructor() { }
  ngOnChanges() { }
}
