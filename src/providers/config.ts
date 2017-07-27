import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { CreditCard } from '../models/creditCard';

@Injectable()
export class ConfigProvider {

  private CONFIG_LOGIN = 'login'
  private CONFIG_INTROSEEN = 'intro'
  private CONFIG_ACTIVECARD = 'activecard'
  private CONFIG_NICKNAMES = 'nicknames'
  private CONFIG_CREDITCARD = 'savecreditcard'

  public cardNicknames = {}

  constructor(
    public storage: Storage
  ) {
    this.cardNicknameLoad().then(
      nicknames => {
        this.cardNicknames = nicknames
      });
  }

  // get the stored username/password
  loginGet(): Promise<[string, string]> {
    return new Promise((resolve, reject) => {
      this.storage.get(this.CONFIG_LOGIN).then(
        login => {
          if (!login)
            return reject()

          resolve([login.username, login.password])
        })
    })
  }

  // remove stored username/password
  loginForget() {
    this.storage.remove(this.CONFIG_LOGIN)
  }

  // save username/password
  loginSave(username, password) {
    this.storage.set(this.CONFIG_LOGIN, {
      'username': username,
      'password': password
    })
  }

  // if user has seen intro
  introHasSeen(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.storage.get(this.CONFIG_INTROSEEN).then(
        introSeen => {
          resolve(introSeen === true);
        })
    })
  }

  // set user has seen intro
  introSetSeen() {
    this.storage.set(this.CONFIG_INTROSEEN, true);
  }

  // store active card ID
  activeCardSet(id: string) {
    this.storage.set(this.CONFIG_ACTIVECARD, id)
  }

  // get active card ID
  activeCardGet(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.storage.get(this.CONFIG_ACTIVECARD).then(
        cardId => {
          if (!cardId)
            return reject()

          resolve(cardId)
        })
    })
  }

  // load card nickname to storage
  cardNicknameLoad() {
    return new Promise((resolve, reject) => {
      this.storage.get(this.CONFIG_NICKNAMES).then(
        nicknames => {
          // if nicknames is not an array, return empty array
          if (!nicknames)
            return resolve([])

          // return the nickname for this card in the array
          resolve(nicknames)
        })
    })
  }

  // get a card's nickname
  cardNicknameGet(cardId: string) {
    return this.cardNicknames[cardId];
  }

  // update card nickname
  // save card nicknames to storage
  cardNicknameSet(cardId: string, nickname: string) {
    // store nickname in array for this card
    this.cardNicknames[cardId] = nickname

    // store
    this.storage.set(this.CONFIG_NICKNAMES, this.cardNicknames)
  }

  // get the stored username/password
  creditCardGet(): Promise<CreditCard> {
    return new Promise((resolve, reject) => {
      this.storage.get(this.CONFIG_CREDITCARD).then(
        (creditCard: CreditCard) => {
          if (!creditCard)
            return reject()

          resolve(creditCard)
        })
    })
  }

  // remove stored username/password
  creditCardForget() {
    this.storage.remove(this.CONFIG_CREDITCARD)
  }

  // save username/password
  creditCardSave(creditCard: CreditCard) {
    this.storage.set(this.CONFIG_CREDITCARD, creditCard)
  }

}
