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
import { ConglomerateComponent } from './conglomerate/conglomerate.component';
import { CompanyComponent } from './company/company.component';
import { CartComponent } from './cart/cart.component';
import { TimeService } from './time.service';
import { PublicWorkComponent } from './public-work/public-work.component';
import { TradeOfferComponent } from './trade-offer/trade-offer.component';
import { RoundComponent } from './round/round.component';
import { CashComponent } from './cash/cash.component';
import { DebugMenuComponent } from './debug-menu/debug-menu.component';
import { MenuDirective } from './menu.directive';

@NgModule({
  declarations: [
    AppComponent,
    StorageComponent,
    GameComponent,
    HomeComponent,
    PageNotFoundComponent,
    ConglomerateComponent,
    CompanyComponent,
    CartComponent,
    PublicWorkComponent,
    TradeOfferComponent,
    RoundComponent,
    CashComponent,
    DebugMenuComponent,
    MenuDirective
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [WebSocketService, TimeService],
  bootstrap: [AppComponent]
})
export class AppModule { }
