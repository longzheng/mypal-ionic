import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable()
export class ConfigProvider {

  constructor(
    public storage: Storage
  ) {
  }

  private CONFIG_LOGIN = 'login'
  private CONFIG_INTROSEEN = 'intro'
  private CONFIG_ACTIVECARD = 'activecard'

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

}
