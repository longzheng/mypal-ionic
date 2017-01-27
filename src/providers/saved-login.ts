import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable()
export class SavedLoginProvider {

  constructor(
    public storage: Storage
  ) {
  }

  // check if stored username/password exists
  has(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.storage.keys().then((keys) => {
        let bool = (keys.indexOf('username') !== -1 && keys.indexOf('password') !== -1)
        resolve(bool)
      })
    })
  }

  // get the stored username/password
  get(): Promise<[string, string]> {
    return new Promise((resolve, reject) => {
      this.storage.get('username').then(
        username => {
          this.storage.get('password').then(
            password => {
              resolve([username, password])
            })
        })
    })
  }

  // remove stored username/password
  forget() {
    this.storage.remove('username')
    this.storage.remove('password')
  }

  // save username/password
  save(username, password) {
    this.storage.set('username', username)
    this.storage.set('password', password)
  }

}
