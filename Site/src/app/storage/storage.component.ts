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
  passwd?: string;
  lastPasswd?: string;
  storage: string[][] = [];
  @Input() messages: string[] = [];
  @Input() showLists!: Record<string, boolean>;
  @Input() onlineList?: Record<string, string[]>;
  @Output() showListEE = new EventEmitter<string>();
  @Output() onlineListEE = new EventEmitter<void>();
  storageForm = new FormGroup({
    game: new FormControl("", this.emptyStringValidator),
    user: new FormControl("", this.emptyStringValidator),
    passwd: new FormControl("", this.emptyStringValidator),
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
      [this.lastGame, this.lastUser, this.lastPasswd] = JSON.parse(lastGame);
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
      if (!userInGameExists) {
        const toStore = [this.game, this.user];
        if (this.passwd)
          toStore.push(this.passwd);
        this.storage.push(toStore);
      }
    } else {
      const toStore = [this.game, this.user];
      if (this.passwd)
        toStore.push(this.passwd);
      this.storage.push(toStore);
    }
    localStorage.setItem("games", JSON.stringify(this.storage));
    if (this.lastGame && this.lastUser) {
      const storageToSet: string[] = [this.lastGame, this.lastUser];
      if (this.lastPasswd)
        storageToSet.push(this.lastPasswd);
      localStorage.setItem("lastGame", JSON.stringify(storageToSet));
    }
  }
  onSubmit() {
    if (this.storageForm.controls["passwd"].valid)
      this.passwd = this.storageForm.controls["passwd"].value!.trim();
    let cmd: string;
    if (this.storageForm.value.delete) {
      // Delete game
      this.game = this.storageForm.value.game!.trim();
      cmd = Cmd.Delete;
    } else if (this.lastGame && this.lastUser && !this.storageForm.controls['game'].valid
      && !this.storageForm.controls['user'].valid && !this.storageForm.controls["passwd"].valid) {
      // Continue last game
      [this.game, this.user, this.passwd] = [this.lastGame, this.lastUser, this.lastPasswd];
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
        [this.lastGame, this.lastUser, this.lastPasswd] = [this.game, this.user, this.passwd];
        this.setStorage();
        this.router.navigate(["/game"]);
        break;
      }
      case Cmd.New: {
        const body: Record<string, string> = { cmd: Cmd.New, user: this.user };
        if (this.passwd)
          body["passwd"] = this.passwd;
        fetch(environment.cmdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }).then(res => res.json()).then(this.checkFetchError).then(reply => {
          this.game = (reply as NewGame).newGame;
          [this.lastGame, this.lastUser, this.lastPasswd] = [this.game, this.user, this.passwd];
          this.setStorage();
          this.router.navigate(["/game"]);
        });
        break;
      }
      case Cmd.Delete: {
        const body: Record<string, string> = { cmd: Cmd.Delete, game: this.game };
        if (this.passwd)
          body["passwd"] = this.passwd;
        fetch(environment.cmdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }).then(res => res.json()).then(this.checkFetchError).then(reply => {
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
            delete this.lastPasswd;
            localStorage.removeItem("lastGame");
          }
          this.messages.length = 0;
          this.messages.push(`Game ${this.game} deleted`);
          this.showListEE.emit("messages");
          localStorage.removeItem(`game:${this.game}:user:${this.user}:cart`);
          localStorage.removeItem(`game:${this.game}:user:${this.user}:accepted-offers`);
        });
        break;
      }
      case Cmd.RemoveUser: {
        const body: Record<string, string> = { cmd: Cmd.RemoveUser, game: this.game, user: this.user };
        if (this.passwd)
          body["passwd"] = this.passwd;
        fetch(environment.cmdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }).then(res => res.json()).then(this.checkFetchError).then(reply => {
          const matchedGameIndex = this.storage
            .findIndex(gameSet => gameSet[0] === this.game && gameSet[1] === this.user);
          if (matchedGameIndex >= 0) {
            this.storage.splice(matchedGameIndex, 1);
            localStorage.setItem("games", JSON.stringify(this.storage));
          }
          if (this.lastGame === this.game && this.lastUser === this.user) {
            delete this.lastGame;
            delete this.lastUser;
            delete this.lastPasswd;
            localStorage.removeItem("lastGame");
          }
          this.messages.length = 0;
          this.messages.push(`User ${this.user} of ${this.game} removed`);
          this.showListEE.emit("messages");
          localStorage.removeItem(`game:${this.game}:user:${this.user}:cart`);
          localStorage.removeItem(`game:${this.game}:user:${this.user}:accepted-offers`);
        });
        break;
      }
      default: break;
    }
  }
  checkFetchError(reply: any): Promise<Next> {
    return new Promise<Next>((resolve, reject) => {
      if (reply.err && reply.why) {
        this.messages.length = 0;
        this.messages.push(`cmd: ${reply.cmd}`, reply.err, reply.why);
        this.showListEE.emit("messages");
        reject(reply);
      } else {
        resolve(reply);
      }
    });
  }
  clearStorage() {
    delete this.lastGame;
    delete this.lastUser;
    delete this.lastPasswd;
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
