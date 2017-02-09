import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable()
export class SavedLoginProvider {

  constructor(
    public storage: Storage
  ) {
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
