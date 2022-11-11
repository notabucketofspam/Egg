import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  down = false;
  @Input() cart!: CartItem[];
  constructor() { }

  ngOnInit(): void {
  }
  toggleCart() {
    this.down = !this.down;
  }
  removeItem(index: number) {
    this.cart.splice(index, 1);
  }
}
