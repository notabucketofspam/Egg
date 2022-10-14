import { Injectable, OnDestroy } from '@angular/core';
import { filter, MonoTypeOperatorFunction, PartialObserver } from 'rxjs';
import { WebSocketMessage } from 'rxjs/internal/observable/dom/WebSocketSubject';
import { webSocket } from "rxjs/webSocket";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  constructor() { }
  private pingFrame = Uint8Array.from([0x9]);
  private pongFrame = Uint8Array.from([0xA]);
  private pingTimeout!: NodeJS.Timer;
  private subject = webSocket<WebSocketMessage>({
    url: "wss://eggonomics.net/wss",
    binaryType: "blob",
    deserializer: event => event.data as WebSocketMessage,
    serializer: value => value
  });
  private filter: MonoTypeOperatorFunction<WebSocketMessage> = filter(function (value, index) {
    if (value instanceof Blob) {
      // Is a ping frame
      const ws = this;
      value.arrayBuffer().then(function (buffer) {
        const bufferUint8 = new Uint8Array(buffer);
        if (bufferUint8.length === 1 && bufferUint8[0] === ws.pingFrame[0]) {
          ws.subject.next(ws.pongFrame);
          ws.isAlive();
          console.log("Ping!");
        }
      });
      return false;
    } else {
      // Not a ping frame
      return true;
    }
  }, this);
  private isAlive() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(function (ws) {
      ws.subject.complete();
    }, 5000, this);
  }
  subscribe(observer?: PartialObserver<WebSocketMessage>) {
    return this.subject.pipe(this.filter).subscribe(observer);
  }
  next(value: WebSocketMessage) {
    this.subject.next(value);
  }
  error(err: any) {
    this.subject.error(err);
  }
  complete() {
    this.subject.complete();
  }
  ngOnDestroy() {
    clearTimeout(this.pingTimeout);
    this.subject.unsubscribe();
  }
}
