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
    let cmd: string;
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
      cmd = Cmd.Delete;
    } else if (this.lastGame && this.lastUser && !this.storageForm.controls['game'].valid
      && !this.storageForm.controls['user'].valid) {
      // Continue last game
      [this.game, this.user] = [this.lastGame, this.lastUser];
      cmd = Cmd.Load;
    } else {
      // Load old game / create new game
      if (this.storageForm.controls['game'].valid) {
        cmd = Cmd.Load;
        this.game = this.storageForm.value.game!.trim();
      } else {
        cmd = Cmd.New;
      }
      this.user = this.storageForm.value.user!.trim();
    }
    this.storageForm.reset();
    switch (cmd) {
      case Cmd.Load: {
        [this.lastGame, this.lastUser] = [this.game, this.user];
        this.setStorage();
        this.router.navigate(['/game', this.game, 'user', this.user]);
        break;
      }
      case Cmd.New: {
        this.subscription = this.websocket.subscribe({
          next: (value) => {
            const reply = JSON.parse(value as string) as Next;
            switch (reply.cmd) {
              case Cmd.New: {
                if (reply.err) {
                  this.messages.push(reply.err, reply.why!);
                  this.subscription!.unsubscribe();
                  break;
                }
                this.game = (reply as NewGame).newGame;
                [this.lastGame, this.lastUser] = [this.game, this.user];
                this.setStorage();
                this.router.navigate(['/game', this.game, 'user', this.user]);
                this.subscription!.unsubscribe();
                break;
              }
              default: break;
            }
          }
        });
        this.websocket.nextJ({ cmd: Cmd.New, user: this.user });
        break;
      }
      case Cmd.Delete: {
        this.subscription = this.websocket.subscribe({
          next: (value) => this.subscription!.unsubscribe()
        });
        this.websocket.nextJ({ cmd: Cmd.Delete, game: this.game });
        this.messages.push(`Game ${this.game} deleted`);
        break;
      }
      default: break;
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
