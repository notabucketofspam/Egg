declare const enum Cmd {
  Ls = "ls",
  Load = "load",
  Update = "update",
  New = "new",
  AddUser = "add-user",
  Delete = "delete",
  RemoveUser = "remove-user",
  Disconnect = "disconnect",
  Ready = "ready",
  Pledge = "pledge",
  Debug = "debug",
  Patch = "patch",
  Member = "member",
  Raise = "raise",
  Reload = "reload"
}
declare type Next = {
  cmd: Cmd,
  err?: string,
  why?: string,
  proof?: Record<string, any>
};
declare interface List extends Next {
  cmd: Cmd.Ls;
  games: Record<string, string[]>;
}
declare interface State extends Next {
  cmd: Cmd.Load;
  users: string[];
  price: Record<string, number>;
  delta: Record<string, number>;
  pw: Record<string, number>;
  round: {
    round: number,
    phase: number
  };
  user: {
    [user: string]: {
      "last-member": Record<string, number>,
      own: Record<string, number>,
      member: Record<string, number>,
      offers: CartItem[],
      "offers-json": string[]
    }
  }
  ready: string[];
  pledge: Record<string, number>;
  "can-trade": string[];
  pa: Record<string, number>;
  cash: Record<string, number>;
  init: Record<string, number>;
  "next-price": Record<string, number>;
  "last-cash": Record<string, number>;
  ver: number;
  "global-ver": number;
  "soup": number;
}
declare interface PartialState {
  [key: string | number]: string | number | PartialState;
}
declare interface NewGame extends Next {
  cmd: Cmd.New;
  newGame: string;
}
declare interface Disconnect extends Next {
  cmd: Cmd.Disconnect;
  reason: string;
}
declare interface CartItem {
  id: string;
  tx?: string;
  rx: string;
  con: string;
  com: string;
  ct: number;
}
declare interface DebugForm {
  cmd: Cmd.Debug,
  game: string,
  field: string,
  user?: string,
  userField?: string,
  prop: string,
  value: string
}
