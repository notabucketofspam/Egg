import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-conglomerate',
  templateUrl: './conglomerate.component.html',
  styleUrls: ['./conglomerate.component.css']
})
export class ConglomerateComponent implements OnInit, OnDestroy {
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
  @Output() memberBubbleEE = new EventEmitter<string>();
  @Input() projected!: Projected;
  constructor() { }
  ngOnDestroy(): void { }
  ngOnInit(): void { }
}
