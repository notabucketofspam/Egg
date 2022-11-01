declare const enum Cmd {
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
declare interface State extends Next {
  cmd: Cmd.Load;
  users: string[];
  price: Record<string, string>;
  delta: Record<string, string>;
  pw: Record<string, string>;
  round: {
    round: string,
    phase: string
  };
  user: {
    [user: string]: {
      own: Record<string, string>,
      member: Record<string, string>
    }
  };
  ready: string[];
  pledge: Record<string, string>;
  ["can-trade"]: string[];
  pa: Record<string, string>;
  cash: Record<string, string>;
}
declare interface Frame extends Next {
  cmd: Cmd.Update;
  users?: string[];
  price?: Record<string, string>;
  delta?: Record<string, string>;
  pw?: Record<string, string>;
  round?: {
    round?: string,
    phase?: string
  };
  user?: {
    [user: string]: {
      own?: Record<string, string>,
      member?: Record<string, string>
    }
  };
  ready?: string[];
  pledge?: Record<string, string>;
  ["can-trade"]?: string[];
  pa?: Record<string, string>;
  cash?: Record<string, string>;
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
