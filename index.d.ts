import * as botbuilder from 'botbuilder';
export interface ITypetalkBotOptions {
    clientId: string;
    clientSecret: string;
    rooms: string;
    defaultDialogId?: string;
    localizer?: botbuilder.ILocalizer;
    sessionStore?: botbuilder.IStorage;
    userStore?: botbuilder.IStorage;
}
export declare class TypetalkBot extends botbuilder.DialogCollection {
    private options;
    private defaultDialogId;
    private localizer;
    private sessionStore;
    private userStore;
    private stream;
    public profile;
    constructor(options: ITypetalkBotOptions);
    public listen(): void;
    getProfile():
    private getUserData(userId);
    private setUserData(userId, data);
    private getSessionData(storeId);
    private setSessionData(storeId, data);
}
