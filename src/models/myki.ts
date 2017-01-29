export namespace Myki {
    export class Account {
        loading: boolean = false;
        holder: string;
        cards: Array<Card>;

        constructor() {
            this.cards = []
        }
    }

    export class Card {
        loading: boolean = false;
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

        constructor() {
            this.transactions = []
        }

        setType(type: string) {
            switch (type) {
                case 'Full Fare':
                    this.type = CardType.FullFare;
                    break;
                case 'Concession':
                    this.type = CardType.Concession;
                    break;
                case 'Children':
                    this.type = CardType.Children;
                    break;
                case 'Seniors':
                    this.type = CardType.Seniors;
                    break;
                default:
                    throw new Error('Invalid card type')
            }
        }

        typeToString(): string {
            switch (this.type) {
                case CardType.FullFare:
                    return "Full fare";
                case CardType.Concession:
                    return "Concession";
                case CardType.Children:
                    return "Children";
                case CardType.Seniors:
                    return "Seniors";
                default:
                    return '';
            }
        }
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