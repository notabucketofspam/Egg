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
  Raise = "raise"
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
      offers: CartItem[]
    }
  };
  ready: string[];
  pledge: Record<string, number>;
  "can-trade": string[];
  pa: Record<string, number>;
  cash: Record<string, number>;
  init: Record<string, number>;
  "second-init": Record<string, number>;
  ver: number;
  "global-ver": number;
}
declare interface PartialState {
  [key: string | number]: string | number | PartialState;
}
declare interface NewGame extends Next {
  cmd: Cmd.New;
  newGame: string;
}
declare interface AddUser extends Next {
  cmd: Cmd.AddUser;
  ok: boolean;
}
declare interface DeleteGame extends Next {
  cmd: Cmd.Delete;
  ok: boolean;
}
declare interface RemoveUser extends Next {
  cmd: Cmd.RemoveUser;
  ok: boolean;
}
declare interface Disconnect extends Next {
  cmd: Cmd.Disconnect;
  reason: string;
}
declare interface CartItem {
  key: string;
  tx?: string;
  rx: string;
  con: string;
  com: string;
  ct: number;
  nix?: number;
}
