import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

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
    "Review Trade Offers",
    "Public Works & Membership Management",
    "Contributions & Good Will"
  ];
  destroyer = new ReplaySubject<boolean>(1);
  constructor() { }
  ngOnInit(): void {
    this.subscriptions["round"] = this.stateSubjects["round"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.readyState = false;
      this.readyIcon = "\u{26AA}";
    });
    this.subscriptions["ready"] = this.stateSubjects["ready"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.setNotReady();
      this.checkIfReady();
    });
  }
  ngOnDestroy() {
    this.destroyer.next(true);
    this.destroyer.complete();
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
