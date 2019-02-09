import { Component } from '@angular/core';
import { NavController, NavParams, LoadingController, AlertController } from 'ionic-angular';
import { GoogleMaps, GoogleMap, GoogleMapOptions, LatLng, MarkerOptions } from '@ionic-native/google-maps';
import { Firebase } from '@ionic-native/firebase';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'page-topup-map',
  templateUrl: 'topup-map.html'
})
export class TopupMapPage {

  map: GoogleMap;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private googleMaps: GoogleMaps,
    private http: HttpClient,
    private firebase: Firebase,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController
  ) { }

  ionViewDidLoad() {
    // log event
    this.firebase.logEvent("select_content", {
      "content_type": "view topup map page",
      "item_id": "page_topup_map"
    })

    this.loadMap();
  }

  loadMap() {
    // create a new map by passing HTMLElement
    let element: HTMLElement = document.getElementById('map');

    let options: GoogleMapOptions = {
      'controls': {
        'compass': true,
        'myLocation': true,
        'myLocationButton': true,
      },
      'gestures': {
        'tilt': false,
      },
      'camera': {
        target: {
          lat: -37.8136,
          lng: 144.9631
        },
        zoom: 17
      }
    };

    this.map = GoogleMaps.create(element, options);

    // center on current location
    // wait a second for things to initialize a bit
    setTimeout(() => {
      this.map.getMyLocation().then(
        location => {
          this.map.moveCamera({
            'target': location.latLng,
            'zoom': 17
          })
        }, error => {
          // no op
        });
    }, 1000)

    // start loading
    const loader = this.loadingCtrl.create({
      content: "Loading...",
    });

    loader.present();

    // load myki top up locations
    this.http.get("assets/js/ptv-myki-outlets.json")
      .subscribe(
        (locations: any) => {
            // process all markers
            for (var i = 0; i < locations.length; i++) {
              let location = locations[i];

              // create new marker
              let markerOptions: MarkerOptions = {
                position: new LatLng(location.outlet_latitude, location.outlet_longitude),
                title: location.outlet_business,
                snippet: `${location.outlet_name}, ${location.outlet_suburb}, ${location.outlet_postcode}
                \r\nMonday: ${location.outlet_business_hour_mon !== null ? location.outlet_business_hour_mon : "N/A"}
                \r\nTuesday: ${location.outlet_business_hour_tue !== null ? location.outlet_business_hour_tue : "N/A"}
                \r\nWednesday: ${location.outlet_business_hour_wed !== null ? location.outlet_business_hour_wed : "N/A"}
                \r\nThursday: ${location.outlet_business_hour_thur !== null ? location.outlet_business_hour_thur : "N/A"}
                \r\nFriday: ${location.outlet_business_hour_fri !== null ? location.outlet_business_hour_fri : "N/A"}
                \r\nSaturday: ${location.outlet_business_hour_sat !== null ? location.outlet_business_hour_sat : "N/A"}
                \r\nSunday: ${location.outlet_business_hour_sun !== null ? location.outlet_business_hour_sun : "N/A"}
                `
              };
              // add marker to list to be added
              this.map.addMarker(markerOptions);
            }
            loader.dismiss();
          }
        , error => {
          loader.dismiss();
          this.alertCtrl.create({
            title: "Top up outlets not available",
            message: "Could not load myki top up outlets data from Public Transport Victoria",
            buttons: ['OK']
          }).present();
        });
  }

  private markerTypeToString(type: string) {
    switch (type) {
      case '0':
        return "Top up only";
      case '1':
        return "Top up only (accessible)"
      case '2':
        return "myki machine (top up only)"
      case '3':
        return "Buy a myki visitor pack"
      case '4':
        return "Buy or top up your myki (24 hours)"
      case '5':
        return "myki machine (buy or top up full fare)"
      case '7':
        return "Buy or top up at ticket office or myki machine"
      case '8':
        return "Buy or top up your myki"
      case '9':
        return "Buy or top up your myki (accessible)"
      case '10':
        return "Buy pre-loaded myki cards only"
      default:
        return "Myki retail output"
    }
  }

}