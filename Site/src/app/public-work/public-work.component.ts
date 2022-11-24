import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-public-work',
  templateUrl: './public-work.component.html',
  styleUrls: ['./public-work.component.css']
})
export class PublicWorkComponent implements OnInit, OnDestroy {
  menuOpen = false;
  menuButtonClass = "Closed";
  menuClass = "NoDisplay";
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
  flavorIcons = [
    "\u{26AA}",
    "\u{1F451}",
    "\u{1F618}",
    "\u{1F4A2}",
    "\u{1F52B}"
  ];
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
  @Output() raiseEE = new EventEmitter<[string, number]>();
  @Input() user!: string;
  @Input() state!: State;
  qualifyIcons = [
    "\u{26AC}", // don't care
    "\u{2714}", // qualify
    "\u{26D2}" // no qualify
  ];
  feeTable = [
    0,
    250,
    350,
    450,
    600
  ];
  dividendTable = [
    0,
    0.15,
    0.25,
    0.35,
    0.5
  ];
  upgradeTable = [
    0,
    450,
    550,
    650,
    800
  ];
  constructor() { }
  ngOnDestroy(): void { }
  ngOnInit(): void { }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.menuButtonClass = this.menuOpen ? "Open" : "Closed";
    this.menuClass = this.menuOpen ? "Display" : "NoDisplay";
  }
  raise() {
    if (this.raiseForm.controls["stock"].value !== null
      && this.raiseForm.controls["flavor"].value !== null) {
      this.raiseEE.emit([this.raiseForm.controls["stock"].value,
      this.flavors.indexOf(this.raiseForm.controls["flavor"].value)]);
      alert(`Congratulations! You have raised a ${this.raiseForm.controls["flavor"].value} \
public work in the company ${this.stockTable
          .find(value => value[0] === this.raiseForm.controls["stock"].value)![2]}!`);
    }
    this.raiseForm.reset({ stock: "---", flavor: "---"});
  }
  getUpgradeCost() {
    return this.stockTable.filter(x => x[0].split(':')[0] === this.raiseForm.controls['stock'].value!.split(':')[0])
      .map(x => this.state.pw[x[0]]).reduce((x, y) => x + this.upgradeTable[y], 0)
      + this.upgradeTable[this.flavors.indexOf(this.raiseForm.controls["flavor"].value!)];
  }
  getQualifyOwn(): [number, string[]] {
    if (this.raiseForm.controls["flavor"].value !== null
      && this.raiseForm.controls['stock'].value !== null
      && this.raiseForm.controls['stock'].value !== '---'
      && this.state.pw[this.raiseForm.controls['stock'].value] == 0) {
      // TODO finish own stuff
      switch (this.raiseForm.controls["flavor"].value) {
        case this.flavors[1]: {
          return [0, ["+ME", "ooo"]];
        }
        case this.flavors[2]: {
          return [0, ["+G"]];
        }
        case this.flavors[3]: {
          return [0, ["+B"]];
        }
        case this.flavors[4]: {
          return [0, ["+DW"]];
        }
        default: return [0, ["+TBD"]];
      }
    } else {
      return [0, ["N/A"]];
    }
  }
  getQualifyStake(): [number, string[]] {
    if (this.raiseForm.controls["flavor"].value !== null
      && this.raiseForm.controls['stock'].value !== null
      && this.raiseForm.controls['stock'].value !== '---'
      && this.state.pw[this.raiseForm.controls['stock'].value] == 0) {
      // TODO finish stake stuff
      switch (this.raiseForm.controls["flavor"].value) {
        case this.flavors[1]: {
          return [0, ["+ME"]];
        }
        case this.flavors[2]: {
          return [0, ["+G"]];
        }
        case this.flavors[3]: {
          return [0, ["+B"]];
        }
        case this.flavors[4]: {
          return [0, ["+DW"]];
        }
        default: return [0, ["+TBD"]];
      }
    } else {
      return [0, ["N/A"]];
    }
  }
}
