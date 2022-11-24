import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-public-work',
  templateUrl: './public-work.component.html',
  styleUrls: ['./public-work.component.css'],
  providers: [CurrencyPipe]
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
    "\u{26AA}", // ---
    "\u{1F451}", // Most Excellent
    "\u{1F618}", // Good
    "\u{1F4A2}", // Bad
    "\u{1F52B}" // Dog Water
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
  fullyQualify = [
    false, // own
    false, // stake
    false // cash
  ];
  qualifyOwnTable = [
    "---",
    "2 consecutive rounds as the Majority Stakeholder",
    "1 round as the Majority Stakeholder",
    "1 round as the Majority Stakeholder",
    "2 consecutive rounds as the Majority Stakeholder"
  ];
  qualifyStakeTable = [
    "---",
    "All Players are stakeholders in the company",
    "3 Players in total are stakeholders in the company",
    "Supermajority stakeholder (75%) at time of raising",
    "Hold all stocks in the company"
  ];
  constructor(private currencyPipe: CurrencyPipe) { }
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
      const lastOwn = this.state.user[this.user]["last-own"][this.raiseForm.controls['stock'].value];
      const nowOwn = this.state.user[this.user].own[this.raiseForm.controls['stock'].value];
      switch (this.raiseForm.controls["flavor"].value) {
        case this.flavors[1]:
        case this.flavors[4]: {
          // Two rounds as majority stakeholder
          const ownStrings: string[] = [];
          ownStrings.push(`Last round: ${lastOwn}`, `This round: ${nowOwn}`);
          const ownIcon = lastOwn > 50 && nowOwn > 50 ? 1 : 2;
          this.fullyQualify[0] = ownIcon === 1;
          return [ownIcon, ownStrings];
        }
        case this.flavors[2]:
        case this.flavors[3]: {
          // One round as majority stakeholder
          const ownStrings: string[] = [];
          ownStrings.push(`This round: ${nowOwn}`);
          const ownIcon = nowOwn > 50 ? 1 : 2;
          this.fullyQualify[0] = ownIcon === 1;
          return [ownIcon, ownStrings];
        }
        default: return [0, ["N/A"]];
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
      switch (this.raiseForm.controls["flavor"].value) {
        case this.flavors[1]: {
          // All players are stakeholders
          const stakeStrings: string[] = [];
          let stakeCount = 0;
          this.state.users.forEach(user => {
            stakeStrings.push(`${user}: ${this.state.user[user].own[this.raiseForm.controls['stock'].value!]}`);
            if (this.state.user[user].own[this.raiseForm.controls['stock'].value!] > 0)
              ++stakeCount;
          });
          const stakeIcon = stakeCount === this.state.users.length ? 1 : 2;
          this.fullyQualify[1] = stakeIcon === 1;
          return [stakeIcon, stakeStrings];
        }
        case this.flavors[2]: {
          // Three players are stakeholders
          const stakeStrings: string[] = [];
          let stakeCount = 0;
          this.state.users.forEach(user => {
            if (this.state.user[user].own[this.raiseForm.controls['stock'].value!] !== 0) {
              stakeStrings.push(`${user}: ${this.state.user[user].own[this.raiseForm.controls['stock'].value!]}`);
              ++stakeCount;
            }
          });
          if (stakeCount === 0)
            stakeStrings.push("No players are stakeholders");
          const stakeIcon = stakeCount >= 3 ? 1 : 2;
          this.fullyQualify[1] = stakeIcon === 1;
          return [stakeIcon, stakeStrings];
        }
        case this.flavors[3]: {
          // Supermajority stakeholder
          const stakeStrings: string[] = [];
          stakeStrings.push(`Your stake: ${this.state.user[this.user].own[this.raiseForm.controls['stock'].value!]}`);
          const stakeIcon = this.state.user[this.user].own[this.raiseForm.controls['stock'].value!] >= 75 ? 1 : 2;
          this.fullyQualify[1] = stakeIcon === 1;
          return [stakeIcon, stakeStrings];
        }
        case this.flavors[4]: {
          // Complete stakeholder
          const stakeStrings: string[] = [];
          stakeStrings.push(`Your stake: ${this.state.user[this.user].own[this.raiseForm.controls['stock'].value!]}`);
          const stakeIcon = this.state.user[this.user].own[this.raiseForm.controls['stock'].value!] === 100 ? 1 : 2;
          this.fullyQualify[1] = stakeIcon === 1;
          return [stakeIcon, stakeStrings];
        }
        default: return [0, ["N/A"]];
      }
    } else {
      return [0, ["N/A"]];
    }
  }
  getQualifyCash(): [string, string] {
    if (this.raiseForm.controls['stock'].value !== null
      && this.raiseForm.controls['stock'].value !== "---") {
      const cashIcon = this.state.pw[this.raiseForm.controls['stock'].value] === 0
        ? this.state.cash[this.user] >= this.feeTable[1]
          ? this.qualifyIcons[1] : this.qualifyIcons[2] : this.qualifyIcons[0];
      const cashString = this.state.pw[this.raiseForm.controls['stock'].value!] === 0
        ? this.currencyPipe.transform(this.state.cash[this.user])! : 'N/A';
      this.fullyQualify[2] = cashIcon === this.qualifyIcons[2];
      return [cashIcon, cashString];
    } else {
      return [this.qualifyIcons[0], "N/A"];
    }
  }
}
