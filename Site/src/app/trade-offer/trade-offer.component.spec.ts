import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradeOfferComponent } from './trade-offer.component';

describe('TradeOfferComponent', () => {
  let component: TradeOfferComponent;
  let fixture: ComponentFixture<TradeOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TradeOfferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TradeOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
