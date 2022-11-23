import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-debug-menu',
  templateUrl: './debug-menu.component.html',
  styleUrls: ['./debug-menu.component.css']
})
export class DebugMenuComponent {
  @Input() state!: State;
  @Output() debugEE = new EventEmitter<PartialState>();
  @Output() breakEE = new EventEmitter<void>();
  @Output() patchEE = new EventEmitter<void>();
  constructor() { }
}
