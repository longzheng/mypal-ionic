export namespace Myki {
    export class Account {
        holder: string;
        cards: Array<Card>;
    }

    export class Card {
        holder: string;
        id: string;
        type: CardType;
        expiry: Date;
        status: CardStatus;
        moneyBalance: number;
        moneyTopupInProgress: number;
        moneyTotalBalance: number;
        passActive: string;
        passInactive: string;
        lastTransactionDate: Date;
        autoTopup: boolean;
        transactions: Array<Transaction>;
    }

    export class Transaction {
        dateTime: Date;
        type: TransactionType;
        service: TransactionService;
        zone: string;
        description: string;
        credit: number;
        debit: number;
        moneyBalance: number;
    }

    export enum CardType {
        FullFare,
        Concession,
        Children,
        Seniors
    }

    export enum CardStatus {
        Active,
        Replaced
    }

    export enum TransactionType {
        TouchOn,
        TouchOff,
        TouchOffDefaultFare,
        TopUpPass,
        TopUpMoney
    }

    export enum TransactionService {
        Bus,
        Train,
        Tram,

        AutoTopUp,
        Website,
    }
}