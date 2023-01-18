import { Injectable, OnDestroy } from '@angular/core';
import { filter, MonoTypeOperatorFunction, PartialObserver, Subject } from 'rxjs';
import { WebSocketMessage, WebSocketSubjectConfig } from 'rxjs/internal/observable/dom/WebSocketSubject';
import { webSocket } from "rxjs/webSocket";
import { environment } from "../environments/environment";
import { ConsoleService } from './console.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private pingFrame = Uint8Array.from([0x9]);
  private pongFrame = Uint8Array.from([0xA]);
  private pingTimeout!: NodeJS.Timer;
  private subjectConfig: WebSocketSubjectConfig<WebSocketMessage> = {
    url: environment.webSocketUrl,
    binaryType: "blob",
    deserializer: (event: any) => event.data as WebSocketMessage,
    serializer: (value: any) => value,
    openObserver: {
      next: ($event: Event) => {
        this.aliveSubject.next(true);
      }
    },
    closeObserver: {
      next: ($event: CloseEvent) => {
        if (!$event.wasClean)
          this.aliveSubject.next(false);
      }
    }
  }
  private subject = webSocket<WebSocketMessage>(this.subjectConfig);
  private filter: MonoTypeOperatorFunction<WebSocketMessage> = filter((value, index) => {
    if (value instanceof Blob) {
      // Is a ping frame
      value.arrayBuffer().then(buffer => {
        const bufferUint8 = new Uint8Array(buffer);
        if (bufferUint8.length === 1 && bufferUint8[0] === this.pingFrame[0]) {
          this.subject.next(this.pongFrame);
          this.isAlive();
          this.console.log("Ping!");
        }
      });
      return false;
    } else {
      // Not a ping frame
      return true;
    }
  });
  aliveSubject = new Subject<boolean>();
  private subjectBits = 0b0;
  constructor(private console: ConsoleService) { }
  private isAlive() {
    if (this.pingTimeout)
      clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      this.subject.unsubscribe();
    }, 36000);
  }
  subscribe(observer?: PartialObserver<WebSocketMessage>) {
    if (this.subjectBits === 0b11)
      this.subject = webSocket<WebSocketMessage>(this.subjectConfig);
    this.subjectBits = 0b1;
    return this.subject.pipe(this.filter).subscribe(observer);
  }
  unsubscribe() {
    this.subject.unsubscribe();
    this.subjectBits |= 0b10;
  }
  next(value: WebSocketMessage) {
    this.subject.next(value);
  }
  nextJ(value: any) {
    this.subject.next(JSON.stringify(value));
  }
  error(err: any) {
    this.subject.error(err);
  }
  complete() {
    this.subject.complete();
  }
  ngOnDestroy() {
    if (this.pingTimeout)
      clearTimeout(this.pingTimeout);
    this.subject.unsubscribe();
  }
}
