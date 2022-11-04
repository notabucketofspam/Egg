import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConglomerateComponent } from './conglomerate.component';

describe('ConglomerateComponent', () => {
  let component: ConglomerateComponent;
  let fixture: ComponentFixture<ConglomerateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConglomerateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConglomerateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
