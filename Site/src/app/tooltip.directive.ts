import { Directive, ElementRef, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appTooltip]'
})
export class TooltipDirective implements OnChanges {
  body: HTMLElement;
  private tooltips: Tooltip[] = [];
  @Input() options: TooltipOption[] = [];

  constructor(private element: ElementRef) {
    this.body = (this.element.nativeElement as Element).ownerDocument.body;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["options"]) {
      this.options.forEach((item, index) => {
        if (typeof this.tooltips[index] === "undefined") {
          const tooltip = {} as Tooltip;
          tooltip.span = document.createElement("span");
          tooltip.span.className = "Tooltip";
          tooltip.span.innerText = item.text ? item.text : "sample text";
          tooltip.span.style.fontFamily = "ITC Legacy Sans Std Book";
          tooltip.delay = item.delay ? item.delay : 5000;
          this.tooltips[index] = tooltip;
        }
        this.tooltips[index].expr = Boolean(item.expr);
      });
    }
  }
  @HostListener("click", ["$event"]) onClick($event: MouseEvent) {
    this.tooltips.forEach(tooltip => {
      if (tooltip.expr) {
        tooltip.span.style.left = `${$event.pageX}px`;
        tooltip.span.style.top = `${$event.pageY}px`;
        this.body.append(tooltip.span);
        if (tooltip.timer)
          clearTimeout(tooltip.timer);
        tooltip.timer = setTimeout(() => {
          tooltip.span!.remove();
        }, tooltip.delay);
      }
    });
  }
}

type TooltipOption = {
  text?: string,
  expr?: boolean,
  delay?: number
};
type Tooltip = {
  span: HTMLSpanElement,
  expr: boolean,
  delay: number,
  timer?: NodeJS.Timer
};
