import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  menuOpen = false;
  menuButtonClass = "Closed";
  menuClass = "NoDisplay";
  @Input() cart!: CartItem[];
  @Output() cartEE = new EventEmitter<string>();
  @Input() cartTotal = 0;
  @Input() state!: State;
  constructor() { }
  ngOnInit(): void { }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "Open" : "Closed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  removeItem(index: number) {
    this.cart.splice(index, 1);
    this.cartEE.emit();
  }
}
