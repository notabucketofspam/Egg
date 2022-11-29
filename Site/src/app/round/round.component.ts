import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html',
  styleUrls: ['./round.component.css']
})
export class RoundComponent implements OnInit, OnChanges, OnDestroy {
  readyState = false;
  @Output() readyEE = new EventEmitter<boolean>();
  readyIcon = "\u{26AA}";
  @Input() user!: string;
  notReady: string[] = [];
  private subscriptions: Record<string, Subscription> = {};
  @Input() state!: State;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  whichPhase: string[] = [
    "Dividends",
    "Pledging",
    "Stock Trading",
    "Second-Chance Stock Trading",
    "Public Works & Membership Management",
    "Contributions & Good Will"
  ];
  constructor() { }
  ngOnInit(): void {
    this.subscriptions["round"] = this.stateSubjects["round"].subscribe(() => {
      this.readyState = false;
      this.readyIcon = "\u{26AA}";
    });
    this.subscriptions["ready"] = this.stateSubjects["ready"].subscribe(() => {
      this.setNotReady();
      this.checkIfReady();
    });
  }
  ngOnDestroy() {
    if (this.subscriptions["round"])
      this.subscriptions["round"].unsubscribe();
    if (this.subscriptions["ready"])
      this.subscriptions["ready"].unsubscribe();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["state"]) {
      if (changes["state"].currentValue["ready"]) {
        this.checkIfReady();
        if (changes["state"].currentValue["users"])
          this.setNotReady();
      }
    }
  }
  toggleReady() {
    this.readyState = !this.readyState;
    this.readyIcon = this.readyState ? "\u{1F534}" : "\u{26AA}";
    this.readyEE.emit(this.readyState);
  }
  setNotReady() {
    this.notReady = this.state.users.filter(username => !this.state.ready.includes(username));
  }
  checkIfReady() {
    if (this.state && this.state.ready) {
      if (this.state.ready.includes(this.user)) {
        this.readyState = true;
        this.readyIcon = "\u{1F534}";
      } else {
        this.readyState = false;
        this.readyIcon = "\u{26AA}";
      }
    }
  }
}
