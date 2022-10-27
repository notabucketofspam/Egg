import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameSyncService } from '../game-sync.service';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  game!: string;
  user!: string;
  private subscription!: Subscription;
  constructor(private route: ActivatedRoute, private title: Title,
    private websocket: WebSocketService) { }
  ngOnInit(): void {
    this.subscription = this.route.params.subscribe(params => {
      this.game = params['game'];
      this.user = params["user"];
      this.title.setTitle(`Game ${this.game} | Eggonomics`);
    });
    //console.log(this.gameSync.lastCommand);
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
