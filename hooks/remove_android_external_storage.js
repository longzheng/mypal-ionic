// This file removes unwanted permissions added by cordova plugins
// see https://cordova.apache.org/docs/en/latest/guide/appdev/hooks/#javascript
//
// Save this script (don't forget to run: npm i xml2js)
// then add an hook in your cordova config.xml:
// <platform name="android">
//     <hook type="after_prepare" src="cordova-hooks/before_compile/check-manifest.js" />
// </platform>

module.exports = function(context) {

    var fs = require('fs');
    var path = require('path');
    var xml2js = require('xml2js');
    var q = require('q');
    var deferral = new q.defer();

    // unwanted permissions here
    var unwantedPermissions = [
        'android.permission.WRITE_EXTERNAL_STORAGE'
    ];

    var androidManifestPath = path.join('platforms', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

    xmlFileToJs(androidManifestPath, function (err, androidManifest) {
        if (err) throw (err);

        var usesPermissions = androidManifest['manifest']['uses-permission'];

        for(var i =  usesPermissions.length-1; i >=0; i--) {
            if(usesPermissions[i]['$']['android:name'].indexOf(unwantedPermissions) === 0) {
                console.log('-> before_compile hook | check-manifest: removed ' + usesPermissions[i]['$']['android:name']);
                usesPermissions.splice(i, 1);
            }
        }

        jsToXmlFile(androidManifestPath, androidManifest, function (err) {
            if (err) console.log(err);
            deferral.resolve();
        });

    });


    function xmlFileToJs(filename, cb) {
        var filepath = path.normalize(path.join(filename));
        fs.readFile(filepath, 'utf8', function (err, xmlStr) {
            if (err) throw (err);
            xml2js.parseString(xmlStr, {}, cb);
        });
    }

    function jsToXmlFile(filename, obj, cb) {
        var filepath = path.normalize(path.join(filename));
        var builder = new xml2js.Builder();
        var xml = builder.buildObject(obj);
        fs.writeFile(filepath, xml, cb);
    }

    return deferral.promise;
};