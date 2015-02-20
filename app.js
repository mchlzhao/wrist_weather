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
var weather;

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
    moved = false;
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
        type: 'json',
        timeout: 5000
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
        console.log('Fetch address failed');
        fetchWeather();
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
        type: 'json',
        timeout: 5000
      },
      function (data) {
        weather = data;
        localStorage.weather = JSON.stringify(data);
        localStorage.lastFetch = currentTime;
        main();
      },
      function (error) {
        console.log('Weather download failed');
        weather = JSON.parse(localStorage.weather);
        main();
      }
    );
  } else {
    console.log('Fetched recently or hasn\'t moved');
    weather = JSON.parse(localStorage.weather);
    main();
  }
}

function main() {
  mainWindow.show();
  splashWindow.hide();
  var iconShowing = true;
  
  var icon = new UI.Image({
    position: new UI.Vector2(27, 28),
    size: new UI.Vector2(90, 70),
  });
  console.log(weather.currently.icon);
  icon.image('images/' + weather.currently.icon + '.png');
  mainWindow.add(icon);
  
  var temperature = new UI.Text({
    position: new UI.Vector2(32, 105),
    size: new UI.Vector2(84, 50),
    color: 'black',
    textAlign: 'center',
    font: 'bitham-42-light',
    text: Math.round(weather.currently.temperature) + '°'
  });
  mainWindow.add(temperature);
  
  var description = new UI.Text({
    position: new UI.Vector2(5, 168),
    size: new UI.Vector2(134, 153),
    color: 'black',
    textAlign: 'left',
    font: 'gothic-18',
    text: weather.hourly.summary + '\n\n' + weather.daily.summary
  });
  mainWindow.add(description);
  
  var dailyWeatherMenu = new UI.Menu({
    sections: [{
      title: localStorage.suburb,
      items: getDailyMenuItems()
    }]
  });
  
  mainWindow.on('click', function (e) {
    var iconPosition = icon.position();
    var temperaturePosition = temperature.position();
    var descriptionPosition = description.position();
    if (e.button === 'select') {
      dailyWeatherMenu.show();
      mainWindow.hide();
    } else if (e.button === 'up' && !iconShowing) {
      descriptionPosition.y = 168;
      description.animate('position', descriptionPosition, 400).queue(function (next) {
        temperaturePosition.y = 105;
        temperature.animate('position', temperaturePosition, 100).queue(function (next) {
          iconPosition.y = 28;
          icon.animate('position', iconPosition, 100);
        });
      });
      iconShowing = !iconShowing;
    } else if (e.button === 'down' && iconShowing) {
      iconPosition.y = -128;
      icon.animate('position', iconPosition, 100).queue(function (next) {
        temperaturePosition.y = -50;
        temperature.animate('position', temperaturePosition, 400).queue(function (next) {
          descriptionPosition.y = 15;
          description.animate('position', descriptionPosition, 100);
        });
      });
      iconShowing = !iconShowing;
    }
  });
  
  dailyWeatherMenu.on('longSelect', function (e) {
    mainWindow.show();
    dailyWeatherMenu.hide();
  });
}

function getDailyMenuItems() {
  var dailyMenuItems = [];
  var dailyData = weather.daily.data;
  dailyData.shift();
  for (var i in dailyData) {
    var date = new Date(dailyData[i].time * 1000);
    dailyMenuItems.push({
      title: date.toDateString().substring(0, date.toDateString().lastIndexOf(' ')),
      subtitle: Math.round(dailyData[i].temperatureMin) + '° - ' + Math.round(dailyData[i].temperatureMax) + '°'
    });
  }
  return dailyMenuItems;
}