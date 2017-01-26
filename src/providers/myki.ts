import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptionsArgs, URLSearchParams, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import { Storage } from '@ionic/storage';
import { Myki } from '../models/myki';
import { CustomURLEncoder } from '../models/customUrlEncoder';
import * as $ from "jquery";
import * as moment from 'moment';

@Injectable()
export class MykiProvider {

  // APi root for all requests
  apiRoot = "https://www.mymyki.com.au/NTSWebPortal/"

  // holders for ASP.NET page state properties
  lastViewState = "";
  lastEventValidation = "";

  // initialize new myki account
  mykiAccount = new Myki.Account();

  constructor(
    public http: Http
  ) {
  }

  // log in to myki account
  login(username: string, password: string): Promise<Response> {
    // specify the login endpoint
    let loginUrl = `${this.apiRoot}login.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAsp(loginUrl).then(
        data => {
          // set up form fields
          const body = new URLSearchParams()
          body.set('ctl00$uxContentPlaceHolder$uxUsername', username)
          body.set('ctl00$uxContentPlaceHolder$uxPassword', password)
          body.set('ctl00$uxContentPlaceHolder$uxLogin', 'Login')

          // post form fields
          this.httpPostFormAsp(loginUrl, body).then(
            data => {
              // verify if we are actually logged in
              // successful login redirects us to the "Login-Services.aspx" page
              if (data.url !== `${this.apiRoot}Registered/MyMykiAccount.aspx?menu=My%20myki%20account`)
                return reject()

              // scrape webpage
              let scraperJquery = this.jQueryHTML(data)

              this.mykiAccount.holder = scraperJquery.find('#ctl00_uxContentPlaceHolder_uxUserName').text()

              return resolve();
            },
            error => {
              return reject();
            }
          )
        },
        error => {
          return reject()
        })
    })
  }

  private httpGetAsp(url: string): Promise<Response> {
    // set up request options
    const options = new RequestOptions()
    options.withCredentials = true // set/send cookies

    return new Promise((resolve, reject) => {
      this.http.get(url, options).subscribe(
        data => {
          // update the page state
          this.storePageState(data);

          return resolve(data);
        },
        error => {
          return reject(error);
        }
      )
    })
  }

  private httpPostFormAsp(url: string, body?: URLSearchParams): Promise<Response> {
    // set up request headers
    let headers = new Headers()
    headers.append('Content-Type', 'application/x-www-form-urlencoded') // we're going to submit form data

    // set up request options
    const options = new RequestOptions()
    options.withCredentials = true // set/send cookies
    options.headers = headers

    // set up POST body
    const postBody = new URLSearchParams('', new CustomURLEncoder())
    postBody.set('__VIEWSTATE', this.lastViewState)
    postBody.set('__EVENTVALIDATION', this.lastEventValidation)
    // if we have any supplied body param, add it to our POST body
    if (body != null) {
      postBody.setAll(body)
    }

    return new Promise((resolve, reject) => {
      this.http.post(url, postBody.toString(), options).subscribe(
        data => {
          // update the page state
          this.storePageState(data);

          return resolve(data);
        },
        error => {
          return reject(error);
        }
      )
    })
  }

  private jQueryHTML(html: any): JQuery {
    let scraper = (<any>document).implementation.createHTMLDocument()
    scraper.body.innerHTML = html
    return $(scraper.body.children)
  }

  private storePageState(data: any) {
    let scraperJquery = this.jQueryHTML(data._body)
    this.lastViewState = scraperJquery.find('#__VIEWSTATE').val()
    this.lastEventValidation = scraperJquery.find('#__EVENTVALIDATION').val()
  }

}
