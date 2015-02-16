/**
 * Animations
 *
 * By Michael Zhao
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Accel = require('ui/accel');
var ajax = require('ajax');
Accel.init();

var FETCHDELAY = 1800000;
var MOVELIMIT = 4;
var moved = true;

var splashWindow = new UI.Window({
  fullscreen: true
});

var title = new UI.Text({
  position: new UI.Vector2(0, 40),
  size: new UI.Vector2(144, 20),
  text: 'Wrist Weather',
  color: 'black',
  textAlign: 'center',
  font: 'gothic-28-bold'
});

var name = new UI.Text({
  position: new UI.Vector2(0, 100),
  size: new UI.Vector2(144, 20),
  text: 'Michael Zhao',
  color: 'black',
  textAlign: 'center',
  font: 'gothic-24'
});

var background = new UI.Rect({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  backgroundColor: 'white'
});

splashWindow.add(background);
splashWindow.add(title);
splashWindow.add(name);
splashWindow.show();

var mainWindow = new UI.Window({
  fullscreen: true
});

mainWindow.add(background);

function hasMoved(coords, accuracy) {
  if (Math.abs(Number(localStorage.lat).toFixed(accuracy) - coords.latitude.toFixed(accuracy)) + Math.abs(Number(localStorage.lon).toFixed(accuracy) - coords.longitude.toFixed(accuracy)) > 0) {
    console.log('Moved');
    localStorage.lat = coords.latitude;
    localStorage.lon = coords.longitude;
    return true;
  }
  console.log('22222222222');
  return false;
}

navigator.geolocation.getCurrentPosition(
  function (pos) {
    if (localStorage.lat !== undefined && localStorage.lon !== undefined) {
      console.log('11111111');
      moved = hasMoved(pos.coords, MOVELIMIT);
    } else {
      console.log('Lat Lon not in Local Storage');
      localStorage.lat = pos.coords.latitude;
      localStorage.lon = pos.coords.longitude;
    }
    fetchAddress();
  },
  function (err) {
    console.log('Location error (' + err.code + '): ' + err.message);
    fetchAddress();
  },
  {
    enableHighAccuracy: true,
    maximumAge: 60000,
    timeout: 5000
  }
);

function fetchAddress() {
  if (moved) {
    ajax(
      {
        url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + localStorage.lat + ',' + localStorage.lon,
        type: 'json'
      },
      function (data) {
        localStorage.suburb = (function () {
          var addressComponents = data.results[0].address_components;
          for (var i in addressComponents) {
            if (addressComponents[i].types[0] === 'locality') {
              return addressComponents[i].short_name;
            }
          }
        })();
        fetchWeather();
      },
      function (error) {
        console.log('Fetch address failed: ' + error);
      }
    );
  } else {
    fetchWeather();
  }
}

function fetchWeather() {
  var currentTime = (new Date()).getTime();
  
  if (moved || localStorage.lastFetch === undefined || currentTime - localStorage.lastFetch > FETCHDELAY) {
    ajax(
      {
        url: 'https://api.forecast.io/forecast/68f8c34082a9d39ed4c038a9ff4c22b1/' + localStorage.lat + ',' + localStorage.lon + '?units=auto&exclude=minutely,flags',
        type: 'json'
      },
      function (data) {
        localStorage.weather = JSON.stringify(data);
        localStorage.lastFetch = currentTime;
        main();
      },
      function (error) {
        console.log('Weather download failed');
      }
    );
  } else {
    console.log('Fetched recently or hasn\'t moved');
    main();
  }
}

function main() {
  mainWindow.show();
  splashWindow.hide();
  var iconShowing = true;
  var weather = JSON.parse(localStorage.weather);
  
  var icon = new UI.Image({
    position: new UI.Vector2(8, 12),
    size: new UI.Vector2(128, 128),
  });
  icon.image('images/' + weather.currently.icon + '.png');
  mainWindow.add(icon);
  
  var temperature = new UI.Text({
    position: new UI.Vector2(35, 105),
    size: new UI.Vector2(84, 50),
    color: 'black',
    textAlign: 'center',
    font: 'bitham-42-light',
    text: Math.round(weather.currently.temperature) + '°'
  });
  mainWindow.add(temperature);
  
  var description = new UI.Text({
    position: new UI.Vector2(10, 168),
    size: new UI.Vector2(124, 148),
    color: 'black',
    textAlign: 'left',
    font: 'gothic-18',
    text: weather.hourly.summary + '\n' + weather.daily.summary
  });
  mainWindow.add(description);
  
  var weatherMenu = new UI.Menu({
    sections: [{
      title: 'Weather',
      items: [{title: 'Currently'}, {title: 'Today'}]
    }]
  });
  
  mainWindow.on('click', function (e) {
    var iconPosition = icon.position();
    var temperaturePosition = temperature.position();
    var descriptionPosition = description.position();
    if (e.button === 'select') {
      weatherMenu.show();
      mainWindow.hide();
    } else if (e.button === 'up' && !iconShowing) {
      descriptionPosition.y = 168;
      description.animate('position', descriptionPosition, 400).queue(function (next) {
        temperaturePosition.y = 105;
        temperature.animate('position', temperaturePosition, 100).queue(function (next) {
          iconPosition.y = 12;
          icon.animate('position', iconPosition, 100);
        });
      });
      iconShowing = !iconShowing;
    } else if (e.button === 'down' && iconShowing) {
      iconPosition.y = -128;
      icon.animate('position', iconPosition, 100).queue(function (next) {
        temperaturePosition.y = -50;
        temperature.animate('position', temperaturePosition, 400).queue(function (next) {
          descriptionPosition.y = 10;
          description.animate('position', descriptionPosition, 100);
        });
      });
      iconShowing = !iconShowing;
    }
  });
  
  weatherMenu.on('longSelect', function (e) {
    mainWindow.show();
    weatherMenu.hide();
  });
}