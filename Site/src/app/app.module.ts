import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from "@angular/forms";

import { AppComponent } from './app.component';
import { WebSocketService } from './websocket.service';
import { StorageComponent } from './storage/storage.component';
import { AppRoutingModule } from './app-routing.module';
import { GameComponent } from './game/game.component';

@NgModule({
  declarations: [
    AppComponent,
    StorageComponent,
    GameComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [WebSocketService],
  bootstrap: [AppComponent]
})
export class AppModule { }
