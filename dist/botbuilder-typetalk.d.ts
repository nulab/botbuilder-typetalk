import botbuilder = require('botbuilder');
import WebSocket = require('ws');
export interface ITypetalkBotOptions {
  clientId: string;
  clientSecret: string;
  rooms: string;
  defaultDialogId?: string;
  localizer?: botbuilder.ILocalizer;
  sessionStore?: botbuilder.IStorage;
  userStore?: botbuilder.IStorage;
}
export class TypetalkBot extends botbuilder.DialogCollection {
  private options;
  private defaultDialogId;
  private localizer;
  private sessionStore;
  private userStore;
  private profile;
  private stream;
  constructor(options: ITypetalkBotOptions);
  listen(): void;
  private getUserData(userId);
  private setUserData(userId, data);
  private getSessionData(storeId);
  private setSessionData(storeId, data);
}
