import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html',
  styleUrls: ['./round.component.css']
})
export class RoundComponent implements OnInit {
  menuOpen = false;
  menuButtonClass = "Closed";
  menuClass = "NoDisplay";
  @Input() round: State["round"] = { round: 0, phase: 0 };
  ready = false;
  @Output() readyEE = new EventEmitter<boolean>();
  readyIcon = "\u{26AA}";
  constructor() { }
  ngOnInit(): void { }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "Open" : "Closed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  toggleReady() {
    this.ready = !this.ready;
    this.readyIcon = this.ready ? "\u{1F534}" : "\u{26AA}";
    this.readyEE.emit(this.ready);
  }
}
