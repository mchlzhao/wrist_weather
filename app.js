/**
 * Animations
 *
 * By Michael Zhao
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Accel = require('ui/accel');
var ajax = require('ajax');
var Vibe = require('ui/vibe');
Accel.init();

var FETCHDELAY = 1800000;
var MOVELIMIT = 3;
var moved = true;
var weather;
var directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

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

var splashWindow = new UI.Window({
  fullscreen: true
});
splashWindow.add(background);
splashWindow.add(title);
splashWindow.add(name);
splashWindow.show();

function displayErrorCard(error) {
  var text = 'Please enable WiFi or Data';
  if (error === 1) {
    text = 'Please enable Location';
  }
  
  var errorCard = new UI.Card({
    subtitle: 'Error',
    body: text + ' on your phone and try again.'
  });
  errorCard.show();
  splashWindow.hide();
}

function hasMoved(coords, accuracy) {
  if (Math.abs(Number(localStorage.lat).toFixed(accuracy) - coords.latitude.toFixed(accuracy)) + Math.abs(Number(localStorage.lon).toFixed(accuracy) - coords.longitude.toFixed(accuracy)) > 0) {
    console.log('Moved');
    localStorage.lat = coords.latitude;
    localStorage.lon = coords.longitude;
    return true;
  }
  return false;
}

navigator.geolocation.getCurrentPosition(
  function (pos) {
    if (localStorage.lat !== undefined && localStorage.lon !== undefined) {
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
    displayErrorCard(1);
  },
  {
    enableHighAccuracy: true,
    maximumAge: 60000,
    timeout: 4000
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
        Vibe.vibrate('short');
        fetchWeather();
      },
      function (error) {
        console.log('Fetch address failed');
        displayErrorCard(2);
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
        url: 'https://api.forecast.io/forecast/68f8c34082a9d39ed4c038a9ff4c22b1/' + localStorage.lat + ',' + localStorage.lon + '?units=auto&exclude=hourly,minutely,flags',
        type: 'json',
        timeout: 5000
      },
      function (data) {
        weather = data;
        localStorage.weather = JSON.stringify(data);
        localStorage.lastFetch = currentTime;
        Vibe.vibrate('short');
        main();
      },
      function (error) {
        console.log('Weather download failed');
        displayErrorCard(2);
      }
    );
  } else {
    console.log('Fetched recently or hasn\'t moved');
    weather = JSON.parse(localStorage.weather);
    main();
  }
}

function main() {
  var mainWindow = new UI.Window({
    fullscreen: true
  });
  mainWindow.add(background);
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
    font: 'gothic-24',
    text: weather.daily.summary
  });
  mainWindow.add(description);
  
  var dailyWeatherMenu = new UI.Menu({
    sections: [{
      title: localStorage.suburb,
      items: getDailyMenuItems()
    }]
  });
  
  var dailyInfoCard = new UI.Card({
    scrollable: true,
    style: 'small'
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
          descriptionPosition.y = 2;
          description.animate('position', descriptionPosition, 100);
        });
      });
      iconShowing = !iconShowing;
    }
  });
  
  var dailyInfo = getDailyInfo(['temp', 'precip', 'wind', 'cloud', 'humidity', 'dew', 'light']);
  
  dailyWeatherMenu.on('select', function (e) {
    dailyInfoCard.body(dailyInfo[e.itemIndex]);
    dailyInfoCard.show();
    dailyWeatherMenu.hide();
  });
  
  dailyWeatherMenu.on('longSelect', function (e) {
    mainWindow.show();
    dailyWeatherMenu.hide();
  });
  
  dailyWeatherMenu.on('accelTap', function (e) {
    mainWindow.show();
    dailyWeatherMenu.hide();
  });
  
  dailyInfoCard.on('click', function (e) {
    dailyWeatherMenu.show();
    dailyInfoCard.hide();
  });
  
  dailyInfoCard.on('accelTap', function (e) {
    dailyWeatherMenu.show();
    dailyInfoCard.hide();
  });
}

function getDailyMenuItems() {
  var dailyMenuItems = [];
  var dailyData = weather.daily.data;
  for (var i in dailyData) {
    var date = new Date(dailyData[i].time * 1000);
    dailyMenuItems.push({
      title: date.toDateString().substring(0, date.toDateString().lastIndexOf(' ')),
      subtitle: Math.round(dailyData[i].temperatureMin) + '° - ' + Math.round(dailyData[i].temperatureMax) + '°',
      icon: 'images/' + dailyData[i].icon + '-icon.png'
    });
  }
  return dailyMenuItems;
}

function getDailyInfo(options) {
  var info = [];
  
  for (var i = 0; i < 8; i++) {
    info.push(weather.daily.data[i].summary + '\n');
  }
  
  for (var i in options) {
    switch (options[i]) {
      case 'light':
        for (var j in info) {
          info[j] = info[j] + '\nLight:\n' +
            'Sunrise at ' + getTime(weather.daily.data[j].sunriseTime) + '\n' +
            'Sunset at ' + getTime(weather.daily.data[j].sunsetTime) + '\n' +
            'Moon: ' + getMoonPhase(weather.daily.data[j].moonPhase) + '\n';
        }
        break;
      case 'precip':
        for (var j in info) {
          if (weather.daily.data[j].precipProbability >= 0.05) {
            info[j] = info[j] + '\nPrecipitation:\n' + 
              Math.round(weather.daily.data[j].precipProbability * 100) + '% chance of ' + weather.daily.data[j].precipType + '\n' +
              'Heaviest at ' + getTime(weather.daily.data[j].precipIntensityMaxTime) + '\n';
          }
        }
        break;
      case 'temp':
        for (var j in info) {
          info[j] = info[j] + '\nTemperature:\n' + 
            'Min of ' + Math.round(weather.daily.data[j].temperatureMin) + '° at ' + getTime(weather.daily.data[j].temperatureMinTime) + '\n' +
            'Max of ' + Math.round(weather.daily.data[j].temperatureMax) + '° at ' + getTime(weather.daily.data[j].temperatureMaxTime) + '\n';
        }
        break;
      case 'wind':
        for (var j in info) {
          info[j] = info[j] + '\nWind: ' +
            Math.round(weather.daily.data[j].windSpeed * 3.6) + ' km/h  ' + getWindDirection(weather.daily.data[j].windBearing) + '\n';
        }
        break;
      case 'cloud':
        for (var j in info) {
          info[j] = info[j] + '\nCloud: ' +
            weather.daily.data[j].cloudCover * 100 + '% cover\n';
        }
        break;
      case 'humidity':
        for (var j in info) {
          info[j] = info[j] + '\nHumidity: ' +
            weather.daily.data[j].humidity * 100 + '%\n';
        }
        break;
      case 'dew':
        for (var j in info) {
          info[j] = info[j] + '\nDew Point: ' +
            weather.daily.data[j].dewPoint + '°\n';
        } 
    }
  }
  return info;
}

function getTime(unixTime) {
  var d = new Date(unixTime * 1000);
  return d.toTimeString().substring(0, d.toTimeString().lastIndexOf(':'));
}

function getMoonPhase(phase) {
  if (Math.abs(phase - 1) < 0.02 || phase < 0.02) {
    return 'New Moon';
  } else if (phase < 0.24) {
    return 'Waxing Cresent';
  } else if (Math.abs(phase - 0.25) < 0.02) {
    return 'First Quarter';
  } else if (phase < 0.49) {
    return 'Waxing Gibbous';
  } else if (Math.abs(phase - 0.5) < 0.02) {
    return 'Full Moon';
  } else if (phase < 0.74) {
    return 'Waning Gibbous';
  } else if (Math.abs(phase - 0.75) < 0.02) {
    return 'Last Quarter';
  } else {
    return 'Waning Cresent';
  }
}
  
function getWindDirection(angle) {
  return directions[Math.floor(((angle + 11.25) / 22.5) % 16)];
}