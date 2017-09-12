import { Component, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Myki } from '../../models/myki';
import * as moment from 'moment';
import { Platform } from 'ionic-angular';

@Component({
  selector: 'transaction',
  templateUrl: 'transaction.html'
})
export class TransactionComponent {

  @Input() transaction: Myki.Transaction
  @Input() nextTransaction: Myki.Transaction

  constructor(
    public currencyPipe: CurrencyPipe,
    public platform: Platform,
  ) {
  }

  isTouchOn(): boolean {
    switch (this.transaction.type) {
      case Myki.TransactionType.TouchOn:
        return true;
      default:
        return false;
    }
  }

  isTouchOff(): boolean {
    switch (this.transaction.type) {
      case Myki.TransactionType.TouchOff:
      case Myki.TransactionType.TouchOffDefaultFare:
      case Myki.TransactionType.FareProductSale:
        return true;
      default:
        return false;
    }
  }

  isNextTouchOn(): boolean {
    if (!this.nextTransaction)
      return false;

    return this.nextTransaction.type === Myki.TransactionType.TouchOn;
  }

  isTopup(): boolean {
    switch (this.transaction.type) {
      case Myki.TransactionType.TopUpPass:
      case Myki.TransactionType.TopUpMoney:
        return true;
      default:
        return false;
    }
  }

  isInfo(): boolean {
    switch (this.transaction.type) {
      case Myki.TransactionType.CardPurchase:
      case Myki.TransactionType.Reimbursement:
      case Myki.TransactionType.AdminFee:
      case Myki.TransactionType.MoneyDebit:
      case Myki.TransactionType.Compensation:
      case Myki.TransactionType.CancelTopUpMoney:
      case Myki.TransactionType.CancelTopUpPass:
      case Myki.TransactionType.RefundPass:
        return true;
      default:
        return false;
    }
  }

  isTransport(): boolean {
    return this.isTouchOn() || this.isTouchOff()
  }

  isServiceTrain(): boolean {
    return this.transaction.service === Myki.TransactionService.Train;
  }

  isServiceBus(): boolean {
    return this.transaction.service === Myki.TransactionService.Bus;
  }

  isServiceTram(): boolean {
    return this.transaction.service === Myki.TransactionService.Tram;
  }

  isServiceVLine(): boolean {
    return this.transaction.service === Myki.TransactionService.VLine;
  }

  isMoneyTransaction(): boolean {
    return this.transaction.debit != null && this.isTouchOff()
  }

  isTopupMoney(): boolean {
    return this.transaction.type === Myki.TransactionType.TopUpMoney
  }

  isTopupPass(): boolean {
    return this.transaction.type === Myki.TransactionType.TopUpPass
  }

  isReimbursement(): boolean {
    return this.transaction.type === Myki.TransactionType.Reimbursement
  }

  isCardPurchase(): boolean {
    return this.transaction.type === Myki.TransactionType.CardPurchase
  }

  isMoneyDebit(): boolean {
    return this.transaction.type === Myki.TransactionType.MoneyDebit
  }

  isMoneyPurchase(): boolean {
    return this.transaction.type === Myki.TransactionType.MoneyPurchase
  }

  isCompensation(): boolean {
    return this.transaction.type === Myki.TransactionType.Compensation
  }

  isCancelTopUp(): boolean {
    return this.transaction.type === Myki.TransactionType.CancelTopUpMoney || 
            this.transaction.type === Myki.TransactionType.CancelTopUpPass
  }

  transactionDescription(): string {
    // card purchase
    if (this.isCardPurchase()) {
      let credit = this.currencyPipe.transform(this.transaction.credit, "USD", true)
      return credit
    }

    // debit
    // money debit
    // money purchase
    // cancel top up money
    if (this.isMoneyDebit() || this.isMoneyPurchase() || this.isCancelTopUp()) {
      let debit = this.currencyPipe.transform(this.transaction.debit, "USD", true)
      let balance = this.currencyPipe.transform(this.transaction.moneyBalance, "USD", true)
      return `-${debit} (Balance ${balance})`
    }

    // compensation
    if (this.isCompensation()) {
      let credit = this.currencyPipe.transform(this.transaction.credit, "USD", true)
      let balance = this.currencyPipe.transform(this.transaction.moneyBalance, "USD", true)
      return `+${credit} (Balance ${balance})`
    }

    // credit
    // myki money top up or reimbursement
    if (this.isTopupMoney() || this.isReimbursement()) {
      let credit = this.currencyPipe.transform(this.transaction.credit, "USD", true)
      let balance = this.currencyPipe.transform(this.transaction.moneyBalance, "USD", true)
      return `+${credit} (Balance ${balance})`
    }

    // standard touch on/touch off
    return this.transaction.description
  }

  transactionDate(): string {
    let format = 'LT' // format as 2:03 PM

    // if platform is android
    if (this.platform.is('android')) {
      // detect chrome version
      var chromeRegex = /Chrome\/(\d+)/i
      let userAgentMatch = navigator.userAgent.match(chromeRegex)
      // if we're not using chrome webview or chrome is less than version 56
      // we don't have sticky date headers so display date too
      if (userAgentMatch == null || (userAgentMatch != null && parseInt(userAgentMatch[1]) < 56))
        format = 'D/M LT'
    }

    return moment(this.transaction.dateTime).format(format)
  }

}
