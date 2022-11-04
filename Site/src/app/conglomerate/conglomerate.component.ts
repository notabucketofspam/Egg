import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-conglomerate',
  templateUrl: './conglomerate.component.html',
  styleUrls: ['./conglomerate.component.css']
})
export class ConglomerateComponent implements OnInit {
  @Input() conglomerate!: string;
  constructor() { }

  ngOnInit(): void {
  }

}
