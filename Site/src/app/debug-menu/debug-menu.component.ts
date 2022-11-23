import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-debug-menu',
  templateUrl: './debug-menu.component.html',
  styleUrls: ['./debug-menu.component.css']
})
export class DebugMenuComponent {
  @Input() state!: State;
  @Output() debugEE = new EventEmitter<PartialState>();
  constructor() { }
  updateVer() {
    this.debugEE.emit({ ver: this.state.ver ? this.state.ver : 0 });
  }
}
