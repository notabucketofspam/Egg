import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-debug-menu',
  templateUrl: './debug-menu.component.html',
  styleUrls: ['./debug-menu.component.css']
})
export class DebugMenuComponent implements OnInit, OnDestroy, OnChanges {
  @Input() game!: string;
  @Input() state!: State;
  @Input() stateSubjects!: Record<string, Subject<void>>;
  @Output() debugEE = new EventEmitter<DebugForm>();
  debugForm = new FormGroup({
    field: new FormControl(null as unknown as string),
    user: new FormControl(null as unknown as string),
    userField: new FormControl(null as unknown as string),
    prop: new FormControl(null as unknown as string),
    value: new FormControl(null as unknown as string)
  });
  stockList = [
    "Cathy:CREAM", "Cathy:BEER", "Cathy:CRUNCH", "Cathy:ROLL",
    "Terry:TOWER", "Terry:TAP", "Terry:TIME", "Terry:TENT",
    "Gary:CALC", "Gary:GUI", "Gary:GLIT", "Gary:GPU",
    "Doug:CANN", "Doug:DOOD", "Doug:DUG", "Doug:CLUB"
  ];
  stockAvailability: Record<string, number> = {};
  notReady: string[] = [];
  canNotTrade: string[] = [];
  subscriptions: Record<string, Subscription> = {};
  destroyer = new ReplaySubject<boolean>(1);
  // This is Angular being stubborn again
  Number = Number;
  String = String;
  constructor() { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["state"] && changes["state"].currentValue["users"]) {
      if (changes["state"].currentValue["ready"])
        this.setNotReady();
      if (changes["state"].currentValue["can-trade"])
        this.setCanNotTrade();
      if (changes["state"].currentValue["user"])
        this.resetStockAvailability();
    }
  }
  ngOnDestroy(): void {
    this.destroyer.next(true);
    this.destroyer.complete();
  }
  ngOnInit(): void {
    this.subscriptions["ready"] = this.stateSubjects["ready"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.setNotReady();
    });
    this.subscriptions["can-trade"] = this.stateSubjects["can-trade"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.setCanNotTrade();
    });
    this.subscriptions["user"] = this.stateSubjects["user"].pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.resetStockAvailability();
    });
  }
  submit() {
    const field = this.debugForm.controls["field"].value;
    const user = this.debugForm.controls["user"].value;
    const userField = this.debugForm.controls["userField"].value;
    const prop = this.debugForm.controls["prop"].value;
    const value = this.debugForm.controls["value"].value;
    if (field !== null && prop !== null && value !== null) {
      const form: DebugForm = {
        cmd: Cmd.Debug,
        game: this.game,
        field,
        prop: String(prop),
        value: String(value)
      };
      if (user !== null && userField !== null) {
        form.user = user;
        form.userField = userField;
      }
      this.debugEE.emit(form);
      this.debugForm.reset();
    }
  }
  setNotReady() {
    this.notReady = this.state.users.filter(username => !this.state.ready.includes(username));
  }
  setCanNotTrade() {
    this.canNotTrade = this.state.users.filter(username => !this.state["can-trade"].includes(username));
  }
  resetStockAvailability() {
    this.stockList.forEach(stock => {
      this.stockAvailability[stock] = 100;
      this.state.users.forEach(user => {
        this.stockAvailability[stock] -= this.state.user[user].own[stock];
      });
    });
  }
}
