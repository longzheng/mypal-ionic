![](https://cloud.githubusercontent.com/assets/484912/22861758/f6491d18-f174-11e6-9bec-f6b7e1aaca43.png)
# mypal-ionic
Mobile app to see Myki account details for iOS & Android

## Download links
- [Google Play](https://play.google.com/store/apps/details?id=com.longzheng.mypalionic)
- App Store (Apple refuses to approve the app)

## Background

I'm making this app because the [Myki site](https://www.mymyki.com.au/NTSWebPortal/Login.aspx) doesn't have a mobile view nor a mobile app, and I wanted to experiment with the [Ionic framework](https://ionicframework.com) to make a hybrid mobile app.

## Screenshots
![](https://cloud.githubusercontent.com/assets/484912/23941006/349f8008-09bb-11e7-98f5-25a93d40d387.jpg)

## Current features
- Log in to Myki online account with username & password
- Show current/archived myki cards
- Shows myki money & myki pass balance
- Shows card information
- Shows recent transactions
- Top up with credit card
- Show retail top up outlets

## Build requirements
Must have Cordova and [Ionic 2 installed](https://ionicframework.com/getting-started/) ```npm install -g cordova ionic```

Install npm packages ```npm install```

Restore Ionic state (Cordova platform & plugins) ```ionic state restore```

Run on device ```ionic run android``` or ```ionic run ios```

Debug in browser ```ionic serve``` (When debugging with Chrome, security limitations must be disabled since we're accessing a third-party site without CORS headers)
```
OSX from terminal
open -a Google\ Chrome --args --disable-web-security --user-data-dir
  
Windows from cmd
chrome.exe --disable-web-security --user-data-dir
```
