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

function textCard(text, position, size, relativePosition) {
  this.textElement = new UI.Text({
    position: position,
    size: size,
    borderColor: 'black',
    backgroundColor: 'white',
    color: 'black',
    text: text,
    textAlign: 'left'
  });
  mainWindow.add(this.textElement);
  
  this.relativePosition = relativePosition;
  
  this.move = function (position) {
    if (position !== this.relativePosition) {
      this.relativePosition = position;
      var movePosition = this.textElement.position();
      switch (position) {
        case 'up':
          movePosition.y = 0 - this.textElement.size().y;
          break;
        case 'center':
          movePosition.y = 20;
          break;
        case 'down':
          movePosition.y = 168;
      }
      this.textElement.animate('position', movePosition, 500);
    }
  };
}

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
        url: 'https://api.forecast.io/forecast/68f8c34082a9d39ed4c038a9ff4c22b1/' + localStorage.lat + ',' + localStorage.lon + '?units=auto&exclude=daily,hourly,minutely,flags',
        type: 'json'
      },
      function (data) {
        localStorage.weather = JSON.stringify(data);
        localStorage.lastFetch = currentTime;
        main();
      },
      function (error) {
        console.log('Weather download failed: ' + error);
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
  
  var weatherMenu = new UI.Menu({
    sections: [{
      title: 'Weather',
      items: [{title: 'Currently'}, {title: 'Today'}]
    }]
  });
  
  mainWindow.on('click', function (e) {
    weatherMenu.show();
    mainWindow.hide();
  });
  
  weatherMenu.on('longSelect', function (e) {
    mainWindow.show();
    weatherMenu.hide();
  });
}