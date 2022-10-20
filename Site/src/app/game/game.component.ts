import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  game = "";
  constructor(private route: ActivatedRoute, private title: Title) { }
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.game = params['game'];
      this.title.setTitle(`Game ${this.game} | Eggonomics`);
    });
  }
}
