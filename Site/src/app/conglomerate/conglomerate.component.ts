import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-conglomerate',
  templateUrl: './conglomerate.component.html',
  styleUrls: ['./conglomerate.component.css']
})
export class ConglomerateComponent implements OnInit {
  @Input() conglomerate!: string;
  @Input() state!: State;
  conglomerates: Record<string, string[]> = {
    Cathy: ["CREAM", "BEER", "CRUNCH", "ROLL"],
    Terry: ["TOW", "TAP", "TOWN", "TENT"],
    Gary: ["CALC", "GUI", "GLIT", "GPU"],
    Doug: ["CANN", "DOOD", "DUG", "CLUB"]
  }
  constructor() { }

  ngOnInit(): void {
  }

}
