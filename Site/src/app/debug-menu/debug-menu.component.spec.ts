import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugMenuComponent } from './debug-menu.component';

describe('DebugMenuComponent', () => {
  let component: DebugMenuComponent;
  let fixture: ComponentFixture<DebugMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebugMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebugMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
