import { Component, Input, TrackByFunction } from '@angular/core';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent {
  @Input() messages: Messages = {
    events: {}
  };
  Object = Object;
  String = String;
  whichPhase: string[] = [
    "Dividends",
    "Pledging",
    "Stock Trading",
    "Review Trade Offers",
    "Public Works & Membership Management",
    "Contributions & Good Will"
  ];
  flavor: string[] = [
    "---",
    "Most Excellent",
    "Good",
    "Bad",
    "Dog Water"
  ];
  stockList: Record<string, string> = {
    "Cathy:CREAM": "Cathy's Creamed Corn",
    "Cathy:BEER": "Cathy's Cold Ones",
    "Cathy:CRUNCH": "Cathy Crunch",
    "Cathy:ROLL": "Cathy's Kaiser Rolls",
    "Terri:TOWER": "Terri Towers",
    "Terri:TAP": "Terri's Taphouses",
    "Terri:TIME": "Terri's Timeshares",
    "Terri:TENT": "Terri's Tents",
    "Gary:CALC": "Gary's Graphing Solutions",
    "Gary:GUI": "Gary's GUIs",
    "Gary:GLIT": "Glitches with Gary",
    "Gary:GPU": "Gary's Graphical Solutions",
    "Doug:CANN": "Doug's Dispenceries",
    "Doug:DOOD": "Doodles by Doug",
    "Doug:DUG": "Doug-Outs",
    "Doug:CLUB": "Doug's Dance Club"
  };
  stockTable: string[][] = [
    ["---", "---", "---"],
    ["Cathy:CREAM", "CREAM", "Cathy's Creamed Corn"], ["Cathy:BEER", "BEER", "Cathy's Cold Ones"],
    ["Cathy:CRUNCH", "CRUNCH", "Cathy Crunch"], ["Cathy:ROLL", "ROLL", "Cathy's Kaiser Rolls"],
    ["Terry:TOWER", "TOWER", "Terry Towers"], ["Terry:TAP", "TAP", "Terry's Taphouses"],
    ["Terry:TIME", "TIME", "Terry's Timeshares"], ["Terry:TENT", "TENT", "Terry's Tents"],
    ["Gary:CALC", "CALC", "Gary's Graphing Solutions"], ["Gary:GUI", "GUI", "Gary's GUIs"],
    ["Gary:GLIT", "GLIT", "Glitches with Gary"], ["Gary:GPU", "GPU", "Gary's Graphical Solutions"],
    ["Doug:CANN", "CANN", "Doug's Dispenceries"], ["Doug:DOOD", "DOOD", "Doodles by Doug"],
    ["Doug:DUG", "DUG", "Doug-Outs"], ["Doug:CLUB", "CLUB", "Doug's Dance Club"]
  ];
  constructor() { }
  trackBy(index: number, time: string) {
    if (this.messages)
      return this.messages.events[time];
    else
      return {};
  }
}
