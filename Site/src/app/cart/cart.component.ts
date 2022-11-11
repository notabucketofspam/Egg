import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TimeService } from '../time.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  down = false;
  @Input() cart!: CartItem[];
  @Output() cartEE = new EventEmitter<string>();
  timestamp = "0".repeat(14);
  constructor(private time: TimeService) { }

  ngOnInit(): void {
  }
  toggleCart() {
    this.down = !this.down;
  }
  removeItem(index: number) {
    this.cart.splice(index, 1);
    this.timestamp = this.time.gen();
    this.cartEE.emit(this.timestamp);
  }
}
