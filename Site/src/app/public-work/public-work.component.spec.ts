import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicWorkComponent } from './public-work.component';

describe('PublicWorkComponent', () => {
  let component: PublicWorkComponent;
  let fixture: ComponentFixture<PublicWorkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicWorkComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicWorkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
