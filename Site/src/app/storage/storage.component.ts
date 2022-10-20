import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { Router } from '@angular/router';

@Component({
  selector: 'app-storage',
  templateUrl: './storage.component.html',
  styleUrls: ['./storage.component.css', "../app.component.css"]
})
export class StorageComponent implements OnInit {
  game!: string;
  user!: string;
  storage: string[][] = [];
  messages: string[] = [];
  storageForm = new FormGroup({
    game: new FormControl("", this.emptyStringValidator),
    user: new FormControl("", this.emptyStringValidator)
  });
  constructor(private router: Router) { }
  ngOnInit() { }
  getStorage() {
    this.storage.length = 0;
    this.storage.push(["Trash summary:"]);
    for (let i = 0; i < localStorage.length; ++i)
      this.storage.push([`${localStorage.key(i)!}: ${localStorage.getItem(localStorage.key(i)!)!}`]);
  }
  setStorage() {
    localStorage.setItem(this.storageForm.value.game!.trim(), this.storageForm.value.user!.trim());
    this.storageForm.reset();
    this.messages.push("Your taxes have been filed");
    setTimeout(function (app) {
      app.messages.length = 0;
    }, 6000, this);
  }
  onSubmit() {
    if (!this.storageForm.controls['game'].valid && !this.storageForm.controls['user'].valid) {
      this.game = "BLANK";
      this.user = "BLANK";
    } else {
      this.game = this.storageForm.controls['game'].valid ?
        this.storageForm.value.game!.trim() :
        Date.now().toString(16).padStart(14, "0");
      this.user = this.storageForm.value.user!.trim();
    }
    this.router.navigate(['/game', this.game, 'user', this.user]);
  }
  clearStorage() {
    localStorage.clear();
    this.storage.push(["Trash emptied"]);
    setTimeout(function (app) {
      app.storage.length = 0;
    }, 6000, this);
  }
  private emptyStringValidator(control: AbstractControl<string, string>): ValidationErrors | null {
    const trimmedLength = control.value && control.value.trim().length;
    return trimmedLength ? null : { emptyString: { value: control.value }};
  }
}
