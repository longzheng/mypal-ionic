import * as moment from 'moment';
import '../libs/jquery.payment.js'
import { CreditCard } from './creditCard';

export namespace Myki {
    export class Account {
        holder: string;
        cards: Array<Card> = [];
        loaded: boolean = false;

        reset() {
            this.holder = null
            this.cards = []
            this.loaded = false
        }
    }

    export class Card {
        loaded: boolean = false;
        transactionLoaded: boolean = false;
        holder: string;
        id: string;
        type: string;
        expiry: Date;
        status: CardStatus;
        moneyBalance: number;
        moneyTopUpAppPurchased: number;
        moneyTopupInProgress: number;
        moneyTotalBalance: number;
        passActive: string;
        passActiveExpiry: Date;
        passInactive: string;
        lastTransactionDate: Date;
        autoTopup: boolean;
        transactions: Array<Transaction> = [];
        transactionsGrouped: Array<any>;

        idFormatted(): string {
            if (!this.id)
                return null

            let cardId = this.id
            return `${cardId.substr(0, 1)} ${cardId.substr(1, 5)} ${cardId.substr(6, 4)} ${cardId.substr(10, 4)} ${cardId.substr(14, 1)}`
        }

        passActiveFriendlyText(): string {
            if (!this.passActiveExpiry)
                return 'No pass active'

            let daysLeft = moment(this.passActiveExpiry).startOf('day').diff(moment(), 'days') + 1;
            return `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`
        }

        passActiveFriendlyTextShort(): string {
            if (!this.passActiveExpiry)
                return 'N/A'

            let daysLeft = moment(this.passActiveExpiry).startOf('day').diff(moment(), 'days') + 1;
            return `${daysLeft} day${daysLeft > 1 ? 's' : ''}`
        }

        // preprocess transaction groups by day
        // we're doing this on demand since a dynamic groupBy pipe is too expensive
        groupTransactions() {
            var groups = {};
            this.transactions.forEach(function (transaction) {
                var day = moment(transaction.dateTime).format('dddd ll')
                groups[day] = groups[day] ? groups[day] : { day: day, transactions: [] };
                groups[day].transactions.push(transaction);
            });

            this.transactionsGrouped = Object.keys(groups).map(function (key) { return groups[key] });
        }

        // preprocess transaction list sorting
        // the myki site returns touch off default fare out of order (after a touch on)
        // we need the touch off default fare before a touch on so our visual timeline works
        // all the ordering is reverse because we're displaying in reverse chronological (newest first)
        sortTransactions() {
            this.transactions.sort((a, b) => {
                // first sort by time
                if (a.dateTime > b.dateTime) {
                    // greater than
                    return -1;
                } else if (a.dateTime < b.dateTime) {
                    // less than
                    return 1;
                } else {
                    // the same datetime
                    // sort by type
                    if (a.type === TransactionType.TouchOffDefaultFare) {
                        return 1;
                    } else if ((a.type === TransactionType.TopUpMoney || a.type === TransactionType.TopUpPass) && b.type === TransactionType.TouchOn) {
                        return 1;
                    } else if (a.type === TransactionType.TouchOff && (b.type === TransactionType.TopUpMoney || b.type === TransactionType.TopUpPass)) {
                        return 1;
                    } else {
                        return -1;
                    }
                }
            })
        }

        setStatus(status: string) {
            switch (status) {
                case 'Replaced':
                    this.status = CardStatus.Replaced;
                    break;
                case 'Refunded':
                    this.status = CardStatus.Refunded;
                    break;
                case 'Blocked':
                    this.status = CardStatus.Blocked;
                    break;
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

        setType(type: string) {
            switch (type) {
                case 'Touch on':
                    this.type = TransactionType.TouchOn;
                    break;
                case 'Touch off':
                    this.type = TransactionType.TouchOff;
                    break;
                case 'Touch off (Default Fare)':
                    this.type = TransactionType.TouchOffDefaultFare;
                    break;
                case 'Top up myki pass':
                    this.type = TransactionType.TopUpPass;
                    break;
                case 'Top up myki money':
                    this.type = TransactionType.TopUpMoney;
                    break;
                case 'Cancel top up myki money':
                    this.type = TransactionType.CancelTopUpMoney;
                    break;
                case 'Cancel Top up myki pass':
                    this.type = TransactionType.CancelTopUpPass;
                    break;
                case 'Refund myki pass':
                    this.type = TransactionType.RefundPass;
                    break;
                case 'Card Purchase':
                    this.type = TransactionType.CardPurchase;
                    break;
                case 'Reimbursement':
                    this.type = TransactionType.Reimbursement;
                    break;
                case 'Administration Fee':
                    this.type = TransactionType.AdminFee;
                    break;
                case 'myki money debit':
                    this.type = TransactionType.MoneyDebit;
                    break;
                case 'Fare Product Sale':
                    this.type = TransactionType.FareProductSale;
                    break;
                case 'myki money purchase':
                    this.type = TransactionType.FareProductSale;
                    break;
                case 'Compensation':
                    this.type = TransactionType.Compensation;
                    break;
                case 'Registration Fee':
                    this.type = TransactionType.RegistrationFee;
                    break;
                default:
                    throw new Error('Invalid transaction type "' + type + '"')
            }
        }

        typeToString(): string {
            switch (this.type) {
                case TransactionType.TouchOn:
                    return "Touch on";
                case TransactionType.TouchOff:
                    return "Touch off";
                case TransactionType.TouchOffDefaultFare:
                    return "Touch off (default fare)";
                case TransactionType.TopUpPass:
                    return "Top up myki pass"
                case TransactionType.TopUpMoney:
                    return "Top up myki money";
                case TransactionType.CancelTopUpMoney:
                    return "Cancel top up myki money";
                case TransactionType.CancelTopUpPass:
                    return "Cancel top up myki pass";
                case TransactionType.RefundPass:
                    return "Refund myki pass";
                case TransactionType.CardPurchase:
                    return "Card purchase";
                case TransactionType.Reimbursement:
                    return "Reimbursement";
                case TransactionType.AdminFee:
                    return "Administration fee";
                case TransactionType.MoneyDebit:
                    return "Myki money debit";
                case TransactionType.FareProductSale:
                    return "Fare product sale (touch off)";
                case TransactionType.MoneyPurchase:
                    return "Myki money purchase";
                case TransactionType.Compensation:
                    return "Compensation";
                case TransactionType.RegistrationFee:
                    return "Registration fee";
                default:
                    return '';
            }
        }

        setService(service: string) {
            switch (service) {
                case 'Bus':
                    this.service = TransactionService.Bus;
                    break;
                case 'Train':
                    this.service = TransactionService.Train;
                    break;
                case 'Tram':
                    this.service = TransactionService.Tram;
                    break;
                case 'V/Line':
                    this.service = TransactionService.VLine;
                    break;
                case 'Auto top up':
                    this.service = TransactionService.AutoTopUp;
                    break;
                case 'Website':
                    this.service = TransactionService.Website;
                    break;
                case 'TopCo':
                    this.service = TransactionService.TopCo;
                    break;
                case 'Retail':
                    this.service = TransactionService.Retail;
                    break;
                case 'BPay':
                    this.service = TransactionService.BPay;
                    break;
                case 'TOT':
                    this.service = TransactionService.TOT;
                    break;
                case 'Others':
                    this.service = TransactionService.Others;
                    break;
                case 'Call Center':
                    this.service = TransactionService.CallCenter;
                    break;
                case 'IUSE':
                    this.service = TransactionService.IUSE;
                    break;
                case '-':
                case '':
                    this.service = null;
                    break;
                default:
                    throw new Error('Invalid transaction service "' + service + '"')
            }
        }

        serviceToString(): string {
            switch (this.service) {
                case TransactionService.Bus:
                    return 'Bus';
                case TransactionService.Train:
                    return 'Train';
                case TransactionService.Tram:
                    return 'Tram';
                case TransactionService.VLine:
                    return 'V/Line';
                case TransactionService.AutoTopUp:
                    return 'Auto top up';
                case TransactionService.Website:
                    return 'Website';
                case TransactionService.TopCo:
                    return 'TopCo (NTS OpCo Portal)';
                case TransactionService.Retail:
                    return 'Retail';
                case TransactionService.BPay:
                    return 'BPay';
                case TransactionService.TOT:
                    return 'Ticket office terminal';
                case TransactionService.Others:
                    return 'Others';
                case TransactionService.CallCenter:
                    return 'Call centre';
                case TransactionService.IUSE:
                    return 'iUSEpass';
                default:
                    return '';
            }
        }
    }

    export enum CardStatus {
        Active,
        Replaced,
        Blocked,
        Refunded
    }

    export enum TransactionType {
        TouchOn,
        TouchOff,
        TouchOffDefaultFare,
        TopUpPass,
        TopUpMoney,
        CancelTopUpMoney,
        CancelTopUpPass,
        RefundPass,
        CardPurchase,
        Reimbursement,
        AdminFee,
        MoneyDebit,
        FareProductSale,
        MoneyPurchase,
        Compensation,
        RegistrationFee
    }

    export enum TransactionService {
        Bus,
        Train,
        Tram,
        VLine,

        AutoTopUp,
        Website,
        TopCo,
        Retail,
        BPay,
        TOT,
        Others,
        CallCenter,
        IUSE
    }

    export enum TopupType {
        Money,
        Pass
    }

    export class TopupOptions {
        topupType: Myki.TopupType
        moneyAmount: number
        passDuration: number
        zoneFrom: number
        zoneTo: number
        cnToken: string
        creditCard: CreditCard = new CreditCard()
        reminderType: TopupReminderType
        reminderEmail: string
        reminderMobile: string
        saveCreditCard: boolean

        ccNumberNoSpaces(): string {
            if (this.creditCard.ccNumber === undefined)
                return ''

            return this.creditCard.ccNumber.replace(/\s+/g, '');
        }

        ccExpiryMonth(): string {
            // parse the month/year from the credit card expiry
            let expiry = $.payment.cardExpiryVal(this.creditCard.ccExpiry)
            return expiry.month.toString()
        }

        ccExpiryYear(): string {
            // parse the month/year from the credit card expiry
            let expiry = $.payment.cardExpiryVal(this.creditCard.ccExpiry)
            return expiry.year.toString()
        }
    }

    export class TopupOrder {
        description: string
        amount: number
        gstAmount: number
    }

    export enum TopupReminderType {
        Email,
        Mobile,
        None
    }
}