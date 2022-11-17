import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html',
  styleUrls: ['./round.component.css']
})
export class RoundComponent implements OnInit, OnChanges {
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
  @Input() subject!: Subject<void>;
  subscription!: Subscription;
  constructor() { }
  ngOnInit(): void {
    if (this.subject) {

    }
  }
  ngOnChanges(changes: SimpleChanges) {
    this.subscription = this.subject.subscribe(() => {

    });
    if (changes["ready"]) {
      if (this.ready && this.ready.includes(this.user)) {
        this.readyState = true;
        this.readyIcon = "\u{1F534}";
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
}
