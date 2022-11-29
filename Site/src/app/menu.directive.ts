import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';

@Directive({
  selector: '[appMenu]'
})
export class MenuDirective implements OnInit {
  open = false;
  menuButton!: Element;
  menu!: Element;
  constructor(private element: ElementRef) { }
  ngOnInit(): void {
    this.menuButton = (this.element.nativeElement as Element).getElementsByClassName("MenuButton")[0];
    this.menu = (this.element.nativeElement as Element).getElementsByClassName("Menu")[0];
  }
  @HostListener("click", ["$event.target"])
  onClick(target: EventTarget) {
    if (target === this.menuButton) {
      if (this.open) {
        this.menuButton.classList.replace("Open", "Closed");
        this.menu.classList.replace("Display", "NoDisplay");
      } else {
        this.menuButton.classList.replace("Closed", "Open");
        this.menu.classList.replace("NoDisplay", "Display");
      }
      this.open = !this.open;
    }
  }
}
