import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appMenu]'
})
export class MenuDirective {
  open = false;
  constructor(private element: ElementRef) { }
  @HostListener("click")
  onClick() {
    const menuButton = (this.element.nativeElement as Element).getElementsByClassName("MenuButton")[0];
    const menu = (this.element.nativeElement as Element).getElementsByClassName("Menu")[0];
    if (this.open) {
      menuButton.classList.replace("Open", "Closed");
      menu.classList.replace("Display", "NoDisplay");
    } else {
      menuButton.classList.replace("Closed", "Open");
      menu.classList.replace("NoDisplay", "Display");
    }
    this.open = !this.open;
  }
}
