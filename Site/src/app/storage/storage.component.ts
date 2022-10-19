import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";

@Component({
  selector: 'app-storage',
  templateUrl: './storage.component.html',
  styleUrls: ['./storage.component.css', "../app.component.css"]
})
export class StorageComponent implements OnInit {
  storage: string[] = [];
  messages: string[] = [];
  storageForm = new FormGroup({
    key: new FormControl("", this.emptyStringValidator),
    value: new FormControl("", this.emptyStringValidator)
  });
  constructor() { }
  ngOnInit() { }
  getStorage() {
    this.storage.length = 0;
    this.storage.push("Trash summary:");
    for (let i = 0; i < localStorage.length; ++i)
      this.storage.push(`${localStorage.key(i)!}: ${localStorage.getItem(localStorage.key(i)!)!}`);
  }
  setStorage() {
    localStorage.setItem(this.storageForm.value.key!.trim(), this.storageForm.value.value!.trim());
    this.storageForm.reset();
    this.messages.push("Your taxes have been filed");
    setTimeout(function (app) {
      app.messages.length = 0;
    }, 6000, this);
  }
  clearStorage() {
    localStorage.clear();
    this.storage.push("Trash emptied");
    setTimeout(function (app) {
      app.storage.length = 0;
    }, 6000, this);
  }
  private emptyStringValidator(control: AbstractControl<string, string>): ValidationErrors | null {
    const trimmedLength = control.value && control.value.trim().length;
    return trimmedLength ? null : { emptyString: { value: control.value }};
  }
}
