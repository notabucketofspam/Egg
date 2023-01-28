import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-conglomerate',
  templateUrl: './conglomerate.component.html',
  styleUrls: ['./conglomerate.component.css']
})
export class ConglomerateComponent implements OnInit, OnDestroy, OnChanges {
  @Input() conglomerate!: string;
  @Input() state!: State;
  @Input() user!: string;
  conglomerates: Record<string, string[][]> = {
    Cathy: [["CREAM", "Cathy's Creamed Corn"], ["BEER", "Cathy's Cold Ones"],
      ["CRUNCH", "Cathy Crunch"], ["ROLL", "Cathy's Kaiser Rolls"]],
    Terri: [["TOWER", "Terri Towers"], ["TAP", "Terri's Taphouses"],
      ["TIME", "Terri's Timeshares"], ["TENT", "Terri's Tents"]],
    Gary: [["CALC", "Gary's Graphing Solutions"], ["GUI", "Gary's GUIs"],
      ["GLIT", "Glitches with Gary"], ["GPU", "Gary's Graphical Solutions"]],
    Doug: [["CANN", "Doug's Dispenceries"], ["DOOD", "Doodles by Doug"],
      ["DUG", "Doug-Outs"], ["CLUB", "Doug's Dance Club"]]
  }
  @Input() description!: string;
  @Output() cartBubbleEE = new EventEmitter<CartItem>();
  @Input() cart!: CartItem[];
  @Input() acceptedOffers!: CartItem[];
  @Input() localSubjects!: Record<string, Subject<void>>;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  @Input() projected!: Projected;
  changeMemberPrice = 0;
  tierPrices = [0, 400, 550, 650, 800];
  @Output() memberEE = new EventEmitter<string>();
  private destroyer = new ReplaySubject<boolean>(1);
  private subscriptions: Record<string, Subscription> = {};
  ownsStocks = false;
  memberForm = new FormGroup({
    yes: new FormControl(false)
  });
  constructor() { }
  ngOnDestroy(): void {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  ngOnInit(): void {
    this.subscriptions["pw"] = this.stateSubjects["pw"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetChangeMemberPrice();
    });
    this.subscriptions["user"] = this.stateSubjects["user"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetChangeMemberPrice();
      this.checkOwnsStocks();
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["state"]) {
      if (changes["state"].currentValue.pw)
        this.resetChangeMemberPrice();
      if (changes["state"].currentValue.user)
        this.checkOwnsStocks();
    }
  }
  getUsersInTier(tier: number) {
    if (this.state && this.state.users)
      return this.state.users.filter(username => this.state.user[username].member[this.conglomerate] === tier);
    else
      return [];
  }
  resetChangeMemberPrice() {
    if (this.state && this.state.pw) {
      this.changeMemberPrice = 0;
      const conSiblings: string[] = Object.keys(this.state.pw)
        .filter(value => this.conglomerate === value.split(":")[0]);
      conSiblings.forEach(con => this.changeMemberPrice += this.tierPrices[this.state.pw[con]]);
    }
  }
  onSubmit() {
    const yes = this.memberForm.controls["yes"].value;
    if (yes === true) {
      this.memberEE.emit(this.conglomerate);
      this.memberForm.reset({ yes: false });
    }
  }
  checkOwnsStocks() {
    if (this.state && this.state.user) {
      this.ownsStocks = false;
      for (const [stock, value] of Object.entries(this.state.user[this.user].own)) {
        if (this.conglomerate === stock.split(":")[0] && value > 0) {
          this.ownsStocks = true;
          return;
        }
      }
    }
  }
}
