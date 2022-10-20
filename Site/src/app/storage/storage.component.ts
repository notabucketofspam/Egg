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
  lastGame?: string;
  lastUser?: string;
  storage: string[][] = [];
  messages: string[] = [];
  storageForm = new FormGroup({
    game: new FormControl("", this.emptyStringValidator),
    user: new FormControl("", this.emptyStringValidator)
  });
  constructor(private router: Router) { }
  ngOnInit() {
    const games = localStorage.getItem("games")
    if (games)
      this.storage = JSON.parse(games);
    else
      localStorage.setItem("games", "[]");
    const lastGame = localStorage.getItem("lastGame");
    if (lastGame)
      [this.lastGame, this.lastUser] = JSON.parse(lastGame);
  }
  getStorage() {
    this.messages.length = 0;
    this.messages.push("Trash summary:");
    for (let i = 0; i < localStorage.length; ++i)
      this.messages.push(`${localStorage.key(i)!}: ${localStorage.getItem(localStorage.key(i)!)!}`);
  }
  setStorage() {
    const gameExists = this.storage.find(gameSet => gameSet[0] === this.game);
    if (!gameExists)
      this.storage.push([this.game, this.user]);
    localStorage.setItem("games", JSON.stringify(this.storage));
    localStorage.setItem("lastGame", JSON.stringify([this.lastGame, this.lastUser]));
  }
  onSubmit() {
    if (this.lastGame && this.lastUser && !this.storageForm.controls['game'].valid
      && !this.storageForm.controls['user'].valid) {
    [this.game, this.user] = [this.lastGame, this.lastUser];
    } else {
      this.game = this.storageForm.controls['game'].valid ?
        this.storageForm.value.game!.trim() :
        Date.now().toString(16).padStart(14, "0");
      this.user = this.storageForm.value.user!.trim();
      [this.lastGame, this.lastUser] = [this.game, this.user];
    }
    this.setStorage();
    this.storageForm.reset();
    this.router.navigate(['/game', this.game, 'user', this.user]);
  }
  clearStorage() {
    localStorage.clear();
    this.messages.push("Trash emptied");
    setTimeout(function (app) {
      app.messages.length = 0;
    }, 6000, this);
  }
  private emptyStringValidator(control: AbstractControl<string, string>): ValidationErrors | null {
    const trimmedLength = control.value && control.value.trim().length;
    return trimmedLength ? null : { emptyString: { value: control.value }};
  }
}
