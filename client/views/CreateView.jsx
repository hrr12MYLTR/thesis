/** @jsx React.DOM */

var CreateView = React.createClass({

  componentDidMount: function() {
    var context = this;
    var setLocation = globalState.location;
    if(!setLocation) {
      getLocation(function(location) {
        initMap(location, context, context.searchMap);
      }, this);
    } else {
      initMap(setLocation, context, context.searchMap);
    }
  },

  getInitialState: function () {
    var state = {};
    if (globalState.createState) {
      state = globalState.createState;
    } 
    return state;
  },

  searchMap: function (map, position, marker) {
    google.maps.event.clearListeners(map, 'zoom_changed');

    map.setOptions({disableDefaultUI: true});

    marker.setIcon('/img/map/pin_test.png');

    var context = this;

    var autocomplete = new google.maps.places.Autocomplete(document.getElementById('address'));

    autocomplete.bindTo('bounds', map);

    var infowindow = new google.maps.InfoWindow({
      allow: true,
      maxWidth: 200
    });

    this.setState({infowindow: infowindow});

    this.setState({marker: marker}, function() {

      google.maps.event.addListener(autocomplete, 'place_changed', function() {

        //infowindow.close();

        var place = autocomplete.getPlace();

        context.setState({location: {latitude: place.geometry.location.lat(), longitude: place.geometry.location.lng() } });

        context.setState({address: place.formatted_address });

        if (!place.geometry) {
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(14);
        }

        // Set the position of the marker using the place ID and location.
        context.state.marker.setPlace(({
          placeId: place.place_id,
          location: place.geometry.location
        }));

        //context.state.marker.setVisible(true);

        var parts = place.formatted_address.split(',');
        var street = parts[0];
        var locality = parts[1] + ', ' + parts[2];

        var component = place.address_components[0].long_name + ' ' + place.address_components[1].short_name;
        var placeName = place.name;

        if (component === placeName) {
          place.name = "Spot";
        }

        infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + street + '<br>' + locality + '</div>');

        infowindow.open(map, context.state.marker);
      });
    });
  },

  sendSpot: function (event) {
    event.preventDefault();
    var context = this;
    $.ajax({
      method: 'POST',
      url: '/api/create',
      dataType: 'json',
      data: {
        name: context.state.name,
        category: context.state.category,
        location: context.state.location,
        address: context.state.address,
        description: context.state.description,
        start: timeController.timeToMS(context.state.start),
        end: timeController.timeToMS(context.state.end)
      },
      success: function (data) {
        globalState.createState = undefined;
        socket.emit('newSpot', data);
        window.location = '/#/';
      },
      error: function (error) {
        console.log(error);
      }
    })
  },

  getAddress: function (event) {
    event.preventDefault();

    var context = this;

    var request = {
      location: location,
      type: 'address_components'
    }

    var geocoder = new google.maps.Geocoder;

    var location = {
      lat: globalState.location.latitude,
      lng: globalState.location.longitude
    }
    geocoder.geocode({location: location}, function(results, status) {
      if (status !== 'OK') {
        return console.error('Cannot find user address from location');
      }
      var addressFound = results[0].formatted_address;
      context.setState({ address: addressFound, location:{latitude: globalState.location.latitude, longitude:globalState.location.longitude} });

      context.state.marker.setPlace(({
        placeId: results[0].place_id,
        location: results[0].geometry.location
      }));

      context.state.map.setCenter(results[0].geometry.location);
      context.state.map.setZoom(17);

      var parts = results[0].formatted_address.split(',');
      var street = parts[0];
      var locality = parts[1] + ', ' + parts[2];

      context.state.infowindow.setContent('<div><strong>' + "My Location" + '</strong><br>' + street + '<br>' + locality + '</div>')
      context.state.infowindow.open(context.state.map, context.state.marker);

    })
  },

  selectChange: function(category) {
    this.setState({category: category});
  },

  handleChange: function (event) {
    var context = this;
    var newState = {};

    if (event.target.maxLength) {
      if (event.target.value.length >= event.target.maxLength) {
        event.target.style["background-color"] = "#eaadae";
      } else {
        event.target.style["background-color"] = "";
      }
    }

    newState[event.target.id] = event.target.value;
    this.setState(newState);
  },

  changeAddress: function (event) {
    this.setState({address: event.target.value});
  },

  render: function () {
    globalState.createState = this.state;
    var valueLink = {
      value: this.state.category,
      requestChange: this.selectChange
    };
    
    return (
      <div>
        <div className="create-map-view-container">
          <div id="map"></div>
        </div>
        <div className="reset-button-container">
          <a className="circle gps-found" onClick={this.getAddress}>
            <i className="material-icons">gps_fixed</i>
          </a>
        </div>
        <div>
          <form id="createSpotForm" onChange={this.handleChange} onSubmit={this.sendSpot}>
            <input type="text" id="address" placeholder="Location" onChange={this.changeAddress} value={this.state.address || ''} required />
            <input type="text" id="name" placeholder="Title" defaultValue={this.state.name || ''} maxLength="50" required />
            <select valueLink={valueLink}>
              <option id="category">Select Category</option>
              <option id="category" value="General">&#xf069; General</option>
              <option id="category" value="Food">&#xf0f5; Food</option>
              <option id="category" value="Entertainment">&#xf145; Entertainment</option>
              <option id="category" value="Health & Fitness">&#xf21e; Health & Fitness</option>
              <option id="category" value="Arts & Culture">&#xf1fc; Arts & Culture</option>
              <option id="category" value="Parties & Nightlife">&#xf000; Parties & Nightlife</option>
              <option id="category" value="Nature & Outdoors">&#xf1bb; Nature & Outdoors</option>
              <option id="category" value="Politics">&#xf25b; Politics</option>
              <option id="category" value="Education">&#xf19d; Education</option>
              
            </select>
            <input type="text" id="description" placeholder="Description" defaultValue={this.state.description || ''} required />
            <span className="time-input">Start Time</span>
            <input type="time" id="start" placeholder="Start" defaultValue={this.state.start || ''} required />
            <span className="time-input">End Time</span>
            <input type="time" id="end" placeholder="End" defaultValue={this.state.end || ''} />
            <input type="submit" value="submit" />
          </form>
        </div>
        <LoginRequired />
      </div>
    );
  }
});
