declare const enum Cmd {
  Ls = "ls",
  Load = "load",
  Update = "update",
  New = "new",
  AddUser = "add-user",
  Delete = "delete",
  RemoveUser = "remove-user"
}
declare type Next = {
  cmd: Cmd,
  err?: string,
  why?: string
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
      own: Record<string, number>,
      member: Record<string, number>
    }
  };
  ready: string[];
  pledge: Record<string, number>;
  ["can-trade"]: string[];
  pa: Record<string, number>;
  cash: Record<string, number>;
  init: Record<string, number>;
  ["second-init"]: Record<string, number>;
}
declare interface Frame extends Next {
  cmd: Cmd.Update;
  users?: string[];
  price?: Record<string, number>;
  delta?: Record<string, number>;
  pw?: Record<string, number>;
  round?: {
    round?: number,
    phase?: number
  };
  user?: {
    [user: string]: {
      own?: Record<string, number>,
      member?: Record<string, number>
    }
  };
  ready?: string[];
  pledge?: Record<string, number>;
  ["can-trade"]?: string[];
  pa?: Record<string, number>;
  cash?: Record<string, number>;
  init?: Record<string, number>;
  ["second-init"]?: Record<string, number>;
}
declare interface NewGame extends Next {
  cmd: Cmd.New;
  newGame: string;
}
declare interface AddUser extends Next {
  cmd: Cmd.AddUser;
}
declare interface DeleteGame extends Next {
  cmd: Cmd.Delete;
}
declare interface RemoveUser extends Next {
  cmd: Cmd.RemoveUser;
}