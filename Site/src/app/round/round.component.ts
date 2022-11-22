import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html',
  styleUrls: ['./round.component.css']
})
export class RoundComponent implements OnInit, OnChanges, OnDestroy {
  menuOpen = false;
  menuButtonClass = "Closed";
  menuClass = "NoDisplay";
  //@Input() round: State["round"] = { round: 0, phase: 0 };
  //@Input() ready: string[] = [];
  readyState = false;
  @Output() readyEE = new EventEmitter<boolean>();
  readyIcon = "\u{26AA}";
  @Input() user!: string;
  //@Input() users!: string[];
  notReady: string[] = [];
  //@Input() roundSubject!: Subject<void>;
  //@Input() readySubject!: Subject<void>;
  private subscriptions: Record<string, Subscription> = {};
  @Input() state!: State;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  constructor() { }
  ngOnInit(): void {
    this.subscriptions["round"] = this.stateSubjects["round"].subscribe(() => {
      this.readyState = false;
      this.readyIcon = "\u{26AA}";
    });
    this.subscriptions["ready"] = this.stateSubjects["ready"].subscribe(() => {
      this.setNotReady();
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
        if (this.state.ready && this.state.ready.includes(this.user)) {
          this.readyState = true;
          this.readyIcon = "\u{1F534}";
        }
        if (changes["state"].currentValue["users"])
          this.setNotReady();
      }
    }
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "Open" : "Closed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  toggleReady() {
    this.readyState = !this.readyState;
    this.readyIcon = this.readyState ? "\u{1F534}" : "\u{26AA}";
    this.readyEE.emit(this.readyState);
  }
  setNotReady() {
    this.notReady = this.state.users.filter(username => !this.state.ready.includes(username));
  }
}
