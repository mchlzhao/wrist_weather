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

navigator.geolocation.getCurrentPosition(
  function (pos) {
    localStorage.setItem('lat', pos.coords.latitude);
    localStorage.setItem('lon', pos.coords.longitude);
    fetchAddress();
  },
  function (err) {
    console.log('Location error (' + err.code + '): ' + err.message);
    fetchAddress();
  },
  {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  }
);

function fetchAddress() {
  ajax(
    {
      url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + localStorage.getItem('lat') + ',' + localStorage.getItem('lon'),
      type: 'json'
    },
    function (data) {
      localStorage.setItem('address', parseAddress(data));
      fetchWeather();
    },
    function (error) {
      console.log('Fetch address failed: ' + error);
    }
  );
}

function fetchWeather() {
  ajax(
    {
      url: 'https://api.forecast.io/forecast/68f8c34082a9d39ed4c038a9ff4c22b1/' + localStorage.getItem('lat') + ',' + localStorage.getItem('lon') + '?units=auto',
      type: 'json'
    },
    function (data) {
      console.log('Temp: ' + data.currently.temperature);
      localStorage.setItem('weather', JSON.stringify(data));
      main();
    },
    function (error) {
      console.log('Weather download failed: ' + error);
    }
  );
}

function parseAddress(data) {
  var addressComponents = data.results[0].address_components;
  for (var i in addressComponents) {
    if (addressComponents[i].types[0] === 'locality') {
      return addressComponents[i].short_name;
    }
  }
}

function main() {
  var background = new UI.Rect({
    position: new Vector2(0, 0),
    size: new Vector2(144, 168),
    backgroundColor: 'white'
  });
  mainWindow.add(background);
  
  var cards = [];
  
  var weatherCard = new textCard(localStorage.getItem('address') + '\n' + Math.round(JSON.parse(localStorage.getItem('weather')).currently.temperature), new Vector2(20, 20), new Vector2(104, 128), 'center');
  
  console.log(weatherCard);
  
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