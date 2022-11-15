import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-trade-offer',
  templateUrl: './trade-offer.component.html',
  styleUrls: ['./trade-offer.component.css']
})
export class TradeOfferComponent implements OnChanges {
  menuOpen = false;
  menuButtonClass = "MenuClosed";
  menuClass = "NoDisplay";
  @Input() price!: Record<string, number>;
  constructor() { }
  ngOnChanges() { }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "MenuOpen" : "MenuClosed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
}
