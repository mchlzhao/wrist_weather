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

var textShowing = 0;

var mainWindow = new UI.Window({
  fullscreen: true,
});
mainWindow.show();

function textCard(text, position, size, relativePosition) {
  this.textElement = new UI.Text({
    position: position,
    size: size,
    borderColor: 'black',
    backgroundColor: 'white',
    color: 'black',
    text: text
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
        url: 'https://api.forecast.io/forecast/68f8c34082a9d39ed4c038a9ff4c22b1/' + localStorage.lat + ',' + localStorage.lon + '?units=auto&exclude=hourly,minutely,flags',
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
  var background = new UI.Rect({
    position: new Vector2(0, 0),
    size: new Vector2(144, 168),
    backgroundColor: 'white'
  });
  mainWindow.add(background);
  
  var sunny = new UI.Image({
    position: new UI.Vector2(19, 19),
    size: new UI.Vector2(106, 106),
    backgroundColor: 'clear',
    image: 'images/sunny-icon.png'
  });
  sunny.compositing('and');
  mainWindow.add(sunny);
  
  var cards = [];
  
  // var weatherCard = new textCard(localStorage.suburb + '\n' + Math.round(JSON.parse(localStorage.weather).currently.temperature), new Vector2(20, 20), new Vector2(104, 128), 'center');
  
  // console.log(weatherCard);
  
  Accel.on('tap', function (e) {
    update(cards, 'down');
  });

  mainWindow.on('click', function (e) {
    if (e.button === 'up') {
      update(cards, 'up');
    } else if (e.button === 'down') {
      update(cards, 'down');
    }
  });
}

function update(cards, direction) {
  if (direction === 'up') {
    textShowing--;
    if (textShowing < 0) textShowing = 2;
  } else {
    textShowing = (textShowing + 1) % 3;
  }
  
  switch (textShowing) {
    case 0:
      cards[2].move('down');
      cards[1].move('down');
      cards[0].move('center');
      break;
    case 1:
      cards[2].move('down');
      cards[1].move('center');
      cards[0].move('up');
      break;
    case 2:
      cards[0].move('up');
      cards[1].move('up');
      cards[2].move('center');
  }
}