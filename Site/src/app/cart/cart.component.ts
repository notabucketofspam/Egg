import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TimeService } from '../time.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  menuOpen = false;
  menuButtonClass = "MenuClosed";
  menuClass = "NoDisplay";
  @Input() cart!: CartItem[];
  @Output() cartEE = new EventEmitter<string>();
  timestamp = "0".repeat(14);
  @Input() price!: Record<string, number>;
  @Input() cartTotal = 0;
  constructor(private time: TimeService) { }

  ngOnInit(): void {
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "MenuOpen" : "MenuClosed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  removeItem(index: number) {
    this.cart.splice(index, 1);
    this.timestamp = this.time.gen();
    this.cartEE.emit(this.timestamp);
  }
}
