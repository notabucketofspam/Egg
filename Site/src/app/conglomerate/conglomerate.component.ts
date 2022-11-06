import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-conglomerate',
  templateUrl: './conglomerate.component.html',
  styleUrls: ['./conglomerate.component.css']
})
export class ConglomerateComponent implements OnInit {
  @Input() conglomerate!: string;
  @Input() state!: State;
  @Input() user!: string;
  conglomerates: Record<string, string[][]> = {
    Cathy: [["CREAM", "Cathy's Creamed Corn"], ["BEER", "Cathy's Cold Ones"],
      ["CRUNCH", "Cathy Crunch"], ["ROLL", "Cathy's Kaiser Rolls"]],
    Terry: [["TOWER", "Terry Towers"], ["TAP", "Terry's Taphouses"],
      ["TIME", "Terry's Timeshares"], ["TENT", "Terry's Tents"]],
    Gary: [["CALC", "Gary's Graphing Solutions"], ["GUI", "Gary's GUIs"],
      ["GLIT", "Glitches with Gary"], ["GPU", "Gary's Graphical Solutions"]],
    Doug: [["CANN", "Doug's Dispenceries"], ["DOOD", "Doodles by Doug"],
      ["DUG", "Doug-Outs"], ["CLUB", "Doug's Dance Club"]]
  }
  @Input() description!: string;
  constructor() { }

  ngOnInit(): void {
  }

}
