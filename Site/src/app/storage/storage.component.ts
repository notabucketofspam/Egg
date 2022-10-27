import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from "@angular/forms";
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-storage',
  templateUrl: './storage.component.html',
  styleUrls: ['./storage.component.css', "../app.component.css"]
})
export class StorageComponent implements OnInit, OnDestroy {
  game!: string;
  user!: string;
  lastGame?: string;
  lastUser?: string;
  storage: string[][] = [];
  messages: string[] = [];
  private subscription?: Subscription;  
  storageForm = new FormGroup({
    game: new FormControl("", this.emptyStringValidator),
    user: new FormControl("", this.emptyStringValidator),
    delete: new FormControl(false)
  });
  constructor(private router: Router,
    private websocket: WebSocketService) { }
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
  ngOnDestroy() {
    if (this.subscription)
      this.subscription.unsubscribe();
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
    let lastCommand = "";
    if (this.storageForm.value.delete) {
      // Delete game
      this.game = this.storageForm.value.game!.trim();
      const gameExistsIndex = this.storage.findIndex(gameSet => gameSet[0] === this.game);
      if (gameExistsIndex >= 0) {
        this.storage.splice(gameExistsIndex, 1);
        localStorage.setItem("games", JSON.stringify(this.storage));
      }
      if (this.lastGame === this.game)
        localStorage.removeItem("lastGame");
      lastCommand = "delete";
    } else if (this.lastGame && this.lastUser && !this.storageForm.controls['game'].valid
      && !this.storageForm.controls['user'].valid) {
      // Continue last game
      [this.game, this.user] = [this.lastGame, this.lastUser];
      lastCommand = "load";
    } else {
      // Load old game / create new game
      if (this.storageForm.controls['game'].valid) {
        lastCommand = "load";
        this.game = this.storageForm.value.game!.trim();
      }
      else {
        lastCommand = "new";
        //this.game = Date.now().toString(16).padStart(14, "0");
      }
      this.user = this.storageForm.value.user!.trim();
    }
    this.storageForm.reset();
    if (lastCommand === "load") {
      [this.lastGame, this.lastUser] = [this.game, this.user];
      this.setStorage();
      this.router.navigate(['/game', this.game, 'user', this.user]);
    } else if (lastCommand === "new") {
      this.subscription = this.websocket.subscribe({
        next: (value) => {
          if (typeof value === "string") {
            const newGame = JSON.parse(value);
            if (newGame.newGame) {
              this.game = newGame.newGame;
              [this.lastGame, this.lastUser] = [this.game, this.user];
              this.setStorage();
              this.router.navigate(['/game', this.game, 'user', this.user]);
              this.subscription!.unsubscribe();
            }
          }
        }
      });
      this.websocket.next(JSON.stringify({ cmd: "new", user: this.user }));
    } else if (lastCommand === "delete") {
      this.subscription = this.websocket.subscribe({
        next: (value) => {
          this.messages.push(`Game ${this.game} deleted`);
          this.subscription!.unsubscribe();
        }
      });
      this.websocket.next(JSON.stringify({ cmd: "delete", game: this.game }));
    }
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
