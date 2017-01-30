import { Component, Input } from '@angular/core';
import { Myki } from '../../models/myki';

@Component({
  selector: 'transaction',
  templateUrl: 'transaction.html'
})
export class TransactionComponent {

  @Input() transaction: Myki.Transaction

  constructor() {
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
        return true;
      default:
        return false;
    }
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

  isTransport(): boolean {
    return this.isTouchOn() || this.isTouchOff()
  }

  isPassTransaction(): boolean {
    return isNaN(this.transaction.moneyBalance) && this.isTouchOff()
  }

  isMoneyTransaction(): boolean {
    return this.transaction.debit && this.isTouchOff()
  }

  isTopupMoney(): boolean {
    return this.transaction.type === Myki.TransactionType.TopUpMoney
  }

  isTopupPass(): boolean {
    return this.transaction.type === Myki.TransactionType.TopUpPass
  }

  transactionDescription(): string {
    if (this.transaction.type === Myki.TransactionType.TopUpPass || this.transaction.type === Myki.TransactionType.TopUpMoney) {
      let topupType = this.transaction.type === Myki.TransactionType.TopUpPass ? "Myki pass" : "Myki money"
      let topupMethod: string;

      switch (this.transaction.service) {
        case Myki.TransactionService.AutoTopUp:
          topupMethod = "Auto top up";
          break;
        case Myki.TransactionService.Website:
          topupMethod = "Website";
          break;
      }

      return `${topupType} (${topupMethod})`
    }

    return this.transaction.description
  }

}
