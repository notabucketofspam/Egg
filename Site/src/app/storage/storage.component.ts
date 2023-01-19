import { Component, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from "@angular/forms";
import { Router } from '@angular/router';
import { environment } from "../../environments/environment";

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
  @Input() messages: string[] = [];
  @Input() showLists!: Record<string, boolean>;
  @Input() onlineList?: Record<string, string[]>;
  @Output() showListEE = new EventEmitter<string>();
  @Output() onlineListEE = new EventEmitter<void>();
  storageForm = new FormGroup({
    game: new FormControl("", this.emptyStringValidator),
    user: new FormControl("", this.emptyStringValidator),
    delete: new FormControl(false),
    ["remove-user"]: new FormControl(false)
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
  ngOnDestroy() { }
  Object = Object;
  getStorage() {
    this.showListEE.emit("local");
  }
  setStorage() {
    const gameExists = this.storage.filter(gameSet => gameSet[0] === this.game);
    if (gameExists) {
      const userInGameExists = gameExists.find(gameSet => gameSet[1] === this.user);
      if (!userInGameExists)
        this.storage.push([this.game, this.user]);
    } else {
      this.storage.push([this.game, this.user]);
    }
    localStorage.setItem("games", JSON.stringify(this.storage));
    localStorage.setItem("lastGame", JSON.stringify([this.lastGame, this.lastUser]));
  }
  onSubmit() {
    let cmd: string;
    if (this.storageForm.value.delete) {
      // Delete game
      this.game = this.storageForm.value.game!.trim();
      cmd = Cmd.Delete;
    } else if (this.lastGame && this.lastUser && !this.storageForm.controls['game'].valid
      && !this.storageForm.controls['user'].valid) {
      // Continue last game
      [this.game, this.user] = [this.lastGame, this.lastUser];
      cmd = Cmd.Load;
    } else {
      // Load old game / create new game / remove user
      this.user = this.storageForm.value.user!.trim();
      if (this.storageForm.controls['game'].valid) {
        this.game = this.storageForm.value.game!.trim();
        if (this.storageForm.value['remove-user']) {
          // Remove user
          cmd = Cmd.RemoveUser;
        } else {
          // Load game
          cmd = Cmd.Load;
        }
      } else {
        // New game
        cmd = Cmd.New;
      }
    }
    this.storageForm.reset();
    switch (cmd) {
      case Cmd.Load: {
        [this.lastGame, this.lastUser] = [this.game, this.user];
        this.setStorage();
        this.router.navigate(["/game"]);
        break;
      }
      case Cmd.New: {
        fetch(environment.cmdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cmd: Cmd.New, user: this.user })
        }).then(res => res.json()).then((reply: NewGame) => {
          if (reply.err) {
            this.messages.length = 0;
            this.messages.push(`cmd: ${reply.cmd}`, reply.err, reply.why!);
            this.showListEE.emit("messages");
          } else {
            this.game = reply.newGame;
            [this.lastGame, this.lastUser] = [this.game, this.user];
            this.setStorage();
            this.router.navigate(["/game"]);
          }
        });
        break;
      }
      case Cmd.Delete: {
        fetch(environment.cmdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cmd: Cmd.Delete, game: this.game })
        }).then(res => res.json()).then((reply: Next) => {
          if (reply.err) {
            this.messages.length = 0;
            this.messages.push(`cmd: ${reply.cmd}`, reply.err, reply.why!);
            this.showListEE.emit("messages");
          } else {
            let gamesFound = 0;
            const removeGames = (storage: string[][]) => {
              const gameIndex = storage.findIndex(gameSet => gameSet[0] === this.game);
              if (gameIndex >= 0) {
                ++gamesFound;
                storage.splice(gameIndex, 1);
                removeGames(storage);
              } else {
                return;
              }
            };
            removeGames(this.storage);
            if (gamesFound)
              localStorage.setItem("games", JSON.stringify(this.storage));
            if (this.lastGame === this.game) {
              delete this.lastGame;
              delete this.lastUser;
              localStorage.removeItem("lastGame");
            }
            this.messages.length = 0;
            this.messages.push(`Game ${this.game} deleted`);
            this.showListEE.emit("messages");
            localStorage.removeItem(`game:${this.game}:user:${this.user}:cart`);
            localStorage.removeItem(`game:${this.game}:user:${this.user}:accepted-offers`);
          }
        });
        break;
      }
      case Cmd.RemoveUser: {
        fetch(environment.cmdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cmd: Cmd.RemoveUser, game: this.game, user: this.user })
        }).then(res => res.json()).then((reply: Next) => {
          if (reply.err) {
            this.messages.length = 0;
            this.messages.push(`cmd: ${reply.cmd}`, reply.err, reply.why!);
            this.showListEE.emit("messages");
          } else {
            const matchedGameIndex = this.storage
              .findIndex(gameSet => gameSet[0] === this.game && gameSet[1] === this.user);
            if (matchedGameIndex >= 0) {
              this.storage.splice(matchedGameIndex, 1);
              localStorage.setItem("games", JSON.stringify(this.storage));
            }
            if (this.lastGame === this.game && this.lastUser === this.user) {
              delete this.lastGame;
              delete this.lastUser;
              localStorage.removeItem("lastGame");
            }
            this.messages.length = 0;
            this.messages.push(`User ${this.user} of ${this.game} removed`);
            this.showListEE.emit("messages");
            localStorage.removeItem(`game:${this.game}:user:${this.user}:cart`);
          }
        });
        break;
      }
      default: break;
    }
  }
  clearStorage() {
    delete this.lastGame;
    delete this.lastUser;
    localStorage.clear();
    localStorage.setItem("games", "[]");
    this.messages.length = 0;
    this.messages.push("Local games cache cleared");
    this.storage.length = 0;
    this.showListEE.emit("messages");
  }
  private emptyStringValidator(control: AbstractControl<string, string>): ValidationErrors | null {
    const trimmedLength = control.value && control.value.trim().length;
    return trimmedLength ? null : { emptyString: { value: control.value }};
  }
}
