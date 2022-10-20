import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from "@angular/forms";
import { Router } from '@angular/router';
import { GameSyncService } from '../game-sync.service';

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
    user: new FormControl("", this.emptyStringValidator),
    delete: new FormControl(false)
  });
  constructor(private router: Router, private gameSync: GameSyncService) { }
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
    let deleteGame = false;
    if (this.storageForm.value.delete) {
      // Delete game
      deleteGame = true;
      this.game = this.storageForm.value.game!.trim();
      this.user = "DELETE";
      const gameExistsIndex = this.storage.findIndex(gameSet => gameSet[0] === this.game);
      if (gameExistsIndex >= 0) {
        this.storage.splice(gameExistsIndex, 1);
        localStorage.setItem("games", JSON.stringify(this.storage));
      }
      if (this.lastGame === this.game)
        localStorage.removeItem("lastGame");
      this.gameSync.lastCommand = "delete";
    } else if (this.lastGame && this.lastUser && !this.storageForm.controls['game'].valid
      && !this.storageForm.controls['user'].valid) {
      // Continue last game
      [this.game, this.user] = [this.lastGame, this.lastUser];
      this.gameSync.lastCommand = "load";
    } else {
      // Load old game / create new game
      this.game = this.storageForm.controls['game'].valid ?
        this.storageForm.value.game!.trim() :
        Date.now().toString(16).padStart(14, "0");
      this.user = this.storageForm.value.user!.trim();
      [this.lastGame, this.lastUser] = [this.game, this.user];
      if (this.storageForm.controls['game'].valid)
        this.gameSync.lastCommand = "load";
      else
        this.gameSync.lastCommand = "new";
    }
    this.storageForm.reset();
    if (!deleteGame)
      this.setStorage();
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
