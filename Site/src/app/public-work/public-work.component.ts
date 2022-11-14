import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-public-work',
  templateUrl: './public-work.component.html',
  styleUrls: ['./public-work.component.css']
})
export class PublicWorkComponent implements OnInit, OnDestroy {
  menuOpen = false;
  buttonClass = "Closed";
  divClass = "NoDisplay";
  raiseForm = new FormGroup({
    stock: new FormControl("---"),
    flavor: new FormControl("---")
  });
  flavors = [
    "---",
    "Most Excellent",
    "Good",
    "Bad",
    "Dog Water"
  ];
  stockTable: string[][] = [
    ["---", "---"],
    ["Cathy:CREAM", "CREAM | Cathy's Creamed Corn"], ["Cathy:BEER", "BEER | Cathy's Cold Ones"],
    ["Cathy:CRUNCH", "CRUNCH | Cathy Crunch"], ["Cathy:ROLL", "ROLL | Cathy's Kaiser Rolls"],
    ["Terry:TOWER", "TOWER | Terry Towers"], ["Terry:TAP", "TAP | Terry's Taphouses"],
    ["Terry:TIME", "TIME | Terry's Timeshares"], ["Terry:TENT", "TENT | Terry's Tents"],
    ["Gary:CALC", "CALC | Gary's Graphing Solutions"], ["Gary:GUI", "GUI | Gary's GUIs"],
    ["Gary:GLIT", "GLIT | Glitches with Gary"], ["Gary:GPU", "GPU | Gary's Graphical Solutions"],
    ["Doug:CANN", "CANN | Doug's Dispenceries"], ["Doug:DOOD", "DOOD | Doodles by Doug"],
    ["Doug:DUG", "DUG | Doug-Outs"], ["Doug:CLUB", "CLUB | Doug's Dance Club"]
  ];
  @Input() state = {
    pw: { }
  } as any as State;
  @Output() raiseEE = new EventEmitter<[string, number]>();
  @Input() game!: string;
  @Input() user!: string;
  constructor() { }
  ngOnDestroy(): void { }
  ngOnInit(): void { }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.buttonClass = this.menuOpen ? "Open" : "Closed";
    this.divClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  raise() {
    if (this.raiseForm.controls["stock"].value !== null
      && this.raiseForm.controls["flavor"].value !== null)
      this.raiseEE.emit([this.raiseForm.controls["stock"].value,
      this.flavors.indexOf(this.raiseForm.controls["flavor"].value)]);
    this.raiseForm.reset({ stock: "---", flavor: "---"});
  }
}