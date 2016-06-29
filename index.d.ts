import botbuilder = require('botbuilder');
import WebSocket = require('ws');
export interface ITypetalkBotOptions {
    clientId: string;
    clientSecret: string;
    rooms: string;
    defaultDialogId: string;
    localizer?: botbuilder.ILocalizer;
    sessionStore?: botbuilder.IStorage;
    userStore?: botbuilder.IStorage;
}
export class TypetalkBot extends botbuilder.DialogCollection {
    constructor(options: ITypetalkBotOptions);
    listen(): void;
}
