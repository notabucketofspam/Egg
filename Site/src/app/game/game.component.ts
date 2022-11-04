import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  game!: string;
  user!: string;
  subscriptions: Record<string, Subscription> = {};
  messages: string[] = [];
  errorMessages: string[] = [];
  state = {} as State;
  value = {} as Next;
  constructor(private route: ActivatedRoute, private title: Title,
    private websocket: WebSocketService) { }
  ngOnInit(): void {
    this.subscriptions["route"] = this.route.params.subscribe(params => {
      this.game = params['game'];
      this.user = params["user"];
      this.title.setTitle(`Game ${this.game} | Eggonomics`);
      this.subscriptions["websocket"] = this.websocket.subscribe({
        next: value => this.next(JSON.parse(value as string))
      });
      this.websocket.nextJ({ cmd: Cmd.Load, game: this.game, user: this.user });
    });
  }
  ngOnDestroy() {
    if (this.subscriptions["websocket"])
      this.subscriptions["websocket"].unsubscribe();
    if (this.subscriptions["route"])
      this.subscriptions["route"].unsubscribe();
  }
  private next(value: Next) {
    this.value = value;
    if (value.err) {
      console.log(value);
      this.errorMessages.push(`cmd: ${value.cmd}`, value.err, value.why!);
      return;
    } else {
      this.errorMessages.length = 0;
    }
    switch (value.cmd) {
      case Cmd.Load: {
        // Set initial state of game
        console.log(value);
        this.load(value as State);
        break;
      }
      case Cmd.Update: {
        // Set changes to game state
        console.log(value);
        this.update(value as Frame);
        break;
      }
      case Cmd.RemoveUser:
      case Cmd.AddUser: {
        console.log(value);
        this.websocket.nextJ({ cmd: Cmd.Load, game: this.game, user: this.user });
        break;
      }
      default: {
        const error = { cmd: value.cmd, err: "ENOCMD", why: "Invalid or unexpected command" };
        console.log(error);
        this.errorMessages.push(`cmd: ${error.cmd}`, error.err, error.why);
        break;
      }
    }
  }
  addUser() {
    this.websocket.nextJ({ cmd: Cmd.AddUser, game: this.game, user: this.user });
  }
  load(state: State) {
    this.state = state as State;

  }
  update(frame: Frame) {

  }
}
