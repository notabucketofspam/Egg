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
  @Input() round: State["round"] = { round: 0, phase: 0 };
  @Input() ready: string[] = [];
  readyState = false;
  @Output() readyEE = new EventEmitter<boolean>();
  readyIcon = "\u{26AA}";
  @Input() user!: string;
  @Input() users!: string[];
  notReady: string[] = [];
  @Input() roundSubject!: Subject<void>;
  @Input() readySubject!: Subject<void>;
  roundSubscription!: Subscription;
  readySubscription!: Subscription;
  constructor() { }
  ngOnInit(): void {
    this.roundSubscription = this.roundSubject.subscribe(value => {
      this.readyState = false;
      this.readyIcon = "\u{26AA}";
    });
    this.readySubscription = this.readySubject.subscribe(value => {
      this.setNotReady();
    });
  }
  ngOnDestroy() {
    if (this.roundSubscription)
      this.roundSubscription.unsubscribe();
    if (this.readySubscription)
      this.readySubscription.unsubscribe();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes["ready"]) {
      if (this.ready && this.ready.includes(this.user)) {
        this.readyState = true;
        this.readyIcon = "\u{1F534}";
      }
      if (this.users)
        this.setNotReady();
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
    this.notReady = this.users.filter(username => !this.ready.includes(username));
  }
}
