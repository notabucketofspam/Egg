import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-cash',
  templateUrl: './cash.component.html',
  styleUrls: ['./cash.component.css']
})
export class CashComponent implements OnInit, OnChanges, OnDestroy {
  menuOpen = false;
  menuButtonClass = "Closed";
  menuClass = "NoDisplay";
  @Output() reportEE = new EventEmitter<number>();
  reportForm = new FormGroup({
    amount: new FormControl(0)
  });
  @Input() cart!: CartItem[];
  projected = {
    cash: {} as State["cash"],
    paTotal: 0
  };
  @Input() cartSubject!: Subject<string>;
  paTotal = 0;
  @Input() user!: string;
  @Input() cashSubject!: Subject<void>;
  subscriptions: Record<string, Subscription> = {};
  @Input() stateSubjects!: Record<string, Subject<void>>;
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() state!: State;
  constructor() { }
  ngOnInit(): void {
    this.subscriptions["cash"] = this.stateSubjects["cash"].subscribe(() => {
      console.log("stateSubjects[\"cash\"]");
    });
    this.subscriptions["pa"] = this.stateSubjects["pa"].subscribe(() => {
      console.log("stateSubjects[\"pa\"]");
      if (this.state.users && this.state.pa) {
        this.paTotal = 0;
        for (const username of this.state.users) {
          this.paTotal += this.state.pa[username];
        }
      }
    });
  }
  ngOnDestroy() {
    if (this.subscriptions["pa"])
      this.subscriptions["pa"].unsubscribe();
    if (this.subscriptions["cash"])
      this.subscriptions["cash"].unsubscribe();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue["cash"]) {
        if (this.state.users) {
          for (const username of this.state.users) {
            this.projected.cash[username] = changes["state"].currentValue["cash"][username];
          }
        }
      }
      if (changes["state"].currentValue["pa"]) {
        if (this.state.users) {
          this.paTotal = 0;
          for (const username of this.state.users) {
            this.paTotal += changes["state"].currentValue["pa"][username];
          }
        }
      }
    }
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "Open" : "Closed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  report() {
    if (this.reportForm.controls["amount"].value !== null) {
      this.reportEE.emit(this.reportForm.controls["amount"].value);
      alert(`Cheers, mate! You have pledged \$${this.reportForm.controls["amount"].value} to the Public Account!`);
    }
    this.reportForm.reset({ amount: 0 });
  }
}
