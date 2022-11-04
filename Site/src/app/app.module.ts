import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from "@angular/forms";

import { AppComponent } from './app.component';
import { WebSocketService } from './websocket.service';
import { StorageComponent } from './storage/storage.component';
import { AppRoutingModule } from './app-routing.module';
import { GameComponent } from './game/game.component';
import { HomeComponent } from './home/home.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { GameSyncService } from './game-sync.service';
import { ConglomerateComponent } from './conglomerate/conglomerate.component';
import { CompanyComponent } from './company/company.component';

@NgModule({
  declarations: [
    AppComponent,
    StorageComponent,
    GameComponent,
    HomeComponent,
    PageNotFoundComponent,
    ConglomerateComponent,
    CompanyComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [WebSocketService, GameSyncService],
  bootstrap: [AppComponent]
})
export class AppModule { }
