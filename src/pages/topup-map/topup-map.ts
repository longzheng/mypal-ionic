import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, LatLng, CameraPosition, MarkerOptions, Marker } from '@ionic-native/google-maps';

@Component({
  selector: 'page-topup-map',
  templateUrl: 'topup-map.html'
})
export class TopupMapPage {

  loading: boolean = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private googleMaps: GoogleMaps,
    private http: Http,
  ) { }

  ionViewDidLoad() {
    this.loadMap();
  }

  loadMap() {
    // create a new map by passing HTMLElement
    let element: HTMLElement = document.getElementById('map');

    let map: GoogleMap = this.googleMaps.create(element, {
      'controls': {
        'compass': true,
        'myLocationButton': true
      },
      'gestures': {
        'tilt': false,
      },
      'camera': {
        'latLng': new LatLng(-37.8136, 144.9631),
        'zoom': 17
      }
    });

    // listen to MAP_READY event
    // You must wait for this event to fire before adding something to the map or modifying it in anyway
    map.one(GoogleMapsEvent.MAP_READY).then(() => {

      // center on current location
      // wait a second for things to initialize a bit
      setTimeout(() => {
        map.getMyLocation().then((location) => {
          map.moveCamera({
            'target': location.latLng,
            'zoom': 17
          })
        });
      }, 1000)

      // start loading throbber
      this.loading = true

      // load myki top up locations
      this.http.get("https://www.ptv.vic.gov.au/tickets/myki/ef1d0f60a/xml-list")
        .map(response => response.text())
        .subscribe(
        data => {
          if (data) {
            let parser = new DOMParser();
            let xmlData = parser.parseFromString(data.trim(), "application/xml");
            let locations = xmlData.getElementsByTagName("d");
            for (var i = 0; i < locations.length; i++) {
              let location = locations[i];
              let locationName = location.getElementsByTagName("N")[0].textContent
              let locationLat = parseFloat(location.getElementsByTagName("Lt")[0].textContent)
              let locationLng = parseFloat(location.getElementsByTagName("Lg")[0].textContent)
              // create new marker
              let markerOptions: MarkerOptions = {
                position: new LatLng(locationLat, locationLng),
                title: locationName
              };

              map.addMarker(markerOptions);
            }
          }
        }, error => {
          // no op
        }, () => {
          this.loading = false;
        });


    });


  }

}
