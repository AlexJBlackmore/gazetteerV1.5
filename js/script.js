let countryFeatureGroup;
let myMap;

$(window).on('load', function () {   
    if ($('#preloader').length) {      
		$('#preloader').delay(100).fadeOut('slow', function () {        
			$(this).remove();      
		});    
    }
    
    // Populate country selector
	$.ajax({
		url: "./php/parseJson.php",
		dataType: 'json',
		success: function(result) {
			console.log(result);
			for (i = 0; i < result['data'].length; i++) {
				$('#countrySelect').append($('<option>', {value:result['data'][i]['isoCode'], text:result['data'][i]['name'] + ' - ' + result['data'][i]['isoCode']}));
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			alert("The following error occured: " + jqXHR.status + " " + textStatus);
		}
    }); 
    
    // Create map
    myMap = L.map('mapid');
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	// const tiles = L.tileLayer(tileUrl, { attribution });
	const tiles = L.tileLayer(tileUrl, { 
		minZoom: 3,
		noWrap: true, 
		attribution: attribution});
    tiles.addTo(myMap);
	// End of create map
	

	const southWest = L.latLng(-89.98155760646617, -180);
	const northEast = L.latLng(89.99346179538875, 180);
	const bounds = L.latLngBounds(southWest, northEast);

	myMap.setMaxBounds(bounds);
	myMap.on('drag', function() {
		myMap.panInsideBounds(bounds, { animate: false });
	});

	// markersClusterGroup = L.markerClusterGroup();


    // Button 
    L.easyButton('fa-info', async function(btn, map){
		// helloPopup.setLatLng(map.getCenter()).openOn(map);
		let borderGeoJson = await getBorder($('#countrySelect').val());
		plotBorder(borderGeoJson);
        $("#myModal").modal({backdrop: false});
	},'Show country info').addTo(myMap);
	
	// Button 
    L.easyButton('fa-wikipedia-w', getWiki,'Find Wiki articles near map center').addTo(myMap);

	// Button 
    L.easyButton('fa-globe', getEarthquakes,'Find earthquakes near map center').addTo(myMap);

	// Button 
    L.easyButton('fa-map-marker-alt', getPOI,'Find points of interest near map center').addTo(myMap);

    // Set options for geting user location
    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    // Get user location
    navigator.geolocation.getCurrentPosition(success, error, options);

    // On click show popup
    popup = L.popup();
    myMap.on('click', onMapClick);

    // Change selector
    $('#countrySelect').on('change', changeBorder);
});


// Navigator success handler
function success(pos) {
	const crd = pos.coords;
	console.log('Your current position is:');
	console.log(`Latitude : ${crd.latitude}`);
	console.log(`Longitude: ${crd.longitude}`);
	console.log(`More or less ${crd.accuracy} meters.`);
	
	initPage(crd.latitude, crd.longitude);
}

// Navigator error handler
function error(err) {
	console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Get user location isoCode
function getUserLocIso(lat, lng) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/getIsoCode.php",
			type: 'POST',
			dataType: 'json',
			data: {
				lat: lat,
				lng: lng
			},
			success: function(result) {
				console.log(result);
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("The following error occured: " + jqXHR.status + " " + textStatus);
			}
		}); 

	});
}

// Get country info
function getCountryInfo(isoCode) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/getCountryInfo.php",
			type: 'POST',
			dataType: 'json',
			data: {
				lang: 'en',
				country: isoCode
			},
			success: function(result) {
				console.log(result);
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				let arr = { 
					"continent": result['data'][0]['continent'], 
					"capital": result['data'][0]['capital'], 
					"languages": result['data'][0]['languages'],
					"population": result['data'][0]['population'],
                    "areaInSqKm": result['data'][0]['areaInSqKm'],
                    "currencyCode": result['data'][0]['currencyCode'],
                    "countryName": result['data'][0]['countryName']
				}
				resolve(arr);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("The following error occured: " + jqXHR.status + " " + textStatus);
			}
		}); 

	});
}

function getBorder(isoCode) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "./php/findBorder.php",
            type: 'POST',
            dataType: 'json',
            data: {
                isoCode: isoCode
            },
            success: function(result) {   
                console.log(result['data']);
                console.log("getBorder result type is below");
                console.log(typeof result['data']);
                resolve(result['data']);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("The following error occured: " + jqXHR.status + " " + textStatus);
            }
        }); 
    });
}

function plotBorder(border) {
    if(countryFeatureGroup){
        myMap.removeLayer(countryFeatureGroup);
    }
    countryFeatureGroup = L.geoJSON(border).addTo(myMap);
    myMap.fitBounds(countryFeatureGroup.getBounds());
}

// Get isoCode and then get country info
// Rename to initialisePage??
async function initPage(lat, lng) {
	console.log('Starting....')
	let isoCode = await getUserLocIso(lat, lng);
	console.log('This wont run until async thing done')
	console.log(isoCode);
	
	let countryInfoArr = await getCountryInfo(isoCode);
	console.log(countryInfoArr['capital']);
    console.log(countryInfoArr['languages']);
    $('#capitalCell').html(countryInfoArr['capital']);
    $('#languagesCell').html(countryInfoArr['languages']);
    $('#areaCell').html(countryInfoArr['areaInSqKm']);
    $('#populationCell').html(countryInfoArr['population']);
    $('#currencyCell').html(countryInfoArr['currencyCode']);
    $('#countryNameCell').html(countryInfoArr['countryName']);

    let borderGeoJson = await getBorder(isoCode);
    console.log("Border geoJson logged below");
    console.log(borderGeoJson);
	plotBorder(borderGeoJson);
	
	$('#countrySelect').val(isoCode);
	$('#countryFlag').attr('src', `https://www.countryflags.io/${isoCode}/flat/64.png`);
	$("#myModal").modal({backdrop: false});
}

async function changeBorder() {
    const selectedIsoCode = $('#countrySelect').val();
    let countryInfoArr = await getCountryInfo(selectedIsoCode);
    $('#capitalCell').html(countryInfoArr['capital']);
    $('#languagesCell').html(countryInfoArr['languages']);
    $('#areaCell').html(countryInfoArr['areaInSqKm']);
    $('#populationCell').html(countryInfoArr['population']);
    $('#currencyCell').html(countryInfoArr['currencyCode']);
    $('#countryNameCell').html(countryInfoArr['countryName']);
    let borderGeoJson = await getBorder(selectedIsoCode);
	plotBorder(borderGeoJson);
	$('#countryFlag').attr('src', `https://www.countryflags.io/${selectedIsoCode}/flat/64.png`);
	$("#myModal").modal({backdrop: false});
}

function getWiki() {
	const center = myMap.getCenter();
	$.ajax({
		url: "./php/getWiki.php",
		type: 'POST',
		dataType: 'json',
		data: {
			lat: center.lat,
			lng: center.lng
		},
		success: function(result) {
			console.log(result);
			if (result.status.name == "ok") {
				// ExtraMarkers
				const wikiIcon = L.ExtraMarkers.icon({
					icon: 'fa-wikipedia-w',
					iconColer: 'white',
					markerColor: 'black',
					shape: 'square',
					prefix: 'fa'
				});

				let coords = [];

				console.log("Result length is ")
				console.log(result['data'].length)

				let markersClusterGroup2 = L.markerClusterGroup();

				if(result['data'].length > 0) {
					for(i = 0; i < result['data'].length; i++) {

						const lat = result['data'][i]['lat'];
						const lng = result['data'][i]['lng'];
	
						coords[i] = [lat, lng];
						
						const html = `<h4>${result['data'][i]['title']}</h4>
						<p>${result['data'][i]['summary']}</p>
						<a href="https://${result['data'][i]['wikipediaUrl']}">View Wikipedia article</a>`;
	
						// Create markers and add content
						const marker = L.marker([lat, lng], {icon: wikiIcon});
						marker.bindPopup(html);
						
						// Set onClick handler for markers
						marker.on('click', onClick);
						// Add marker to cluster group
						markersClusterGroup2.addLayer(marker);

					}

					// Add cluster group to map
					myMap.addLayer(markersClusterGroup2);

					myMap.flyToBounds(coords, {padding: [30, 30]});
				}

				if(result['data'].length == 0) {
					$("#noWikiModal").modal({backdrop: false});
				}
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	});
}

function getEarthquakes() {
	const center = myMap.getCenter();
	$.ajax({
		url: "./php/getEarthquakes.php",
		type: 'POST',
		dataType: 'json',
		data: {
			north: center.lat + 4,
			south: center.lat - 4,
			east: center.lng + 4,
			west: center.lng - 4
		},
		success: function(result) {
			console.log(result);
			if (result.status.name == "ok") {
				// ExtraMarkers
				const earthquakeMarker = L.ExtraMarkers.icon({
					icon: 'fa-globe',
					iconColer: 'white',
					markerColor: 'black',
					shape: 'square',
					prefix: 'fa'
				});

				let coords = [];

				let markersClusterGroup3 = L.markerClusterGroup();

				if(result['data'].length > 0) {
					for(i = 0; i < result['data'].length; i++) {
					
						const lat = result['data'][i]['lat'];
						const lng = result['data'][i]['lng'];
						const date = result['data'][i]['datetime'].substring(0, 10);
						const time = result['data'][i]['datetime'].substring(11, 19);
	
						coords[i] = [lat, lng];

						// Create markers and add content
						const marker = L.marker([lat, lng], {icon: earthquakeMarker});

						const html = `<h5>Earthquake information</h5>
						<table class="table">
							<tr>
								<td>Date: </td>
								<td>${date}</td>
							</tr>
							<tr>
								<td>Time: </td>
								<td>${time}</td>
							</tr>
							<tr>
								<td>Depth: </td>
								<td>${result['data'][i]['depth']}</td>
							</tr>
							<tr>
								<td>Magnitude: </td>
								<td>${result['data'][i]['magnitude']}</td>
							</tr>
						</table>`;

						marker.bindPopup(html);
						marker.on('click', onClick);
						
						// Add marker to cluster group
						markersClusterGroup3.addLayer(marker);
					}

					// Add cluster group to map
					myMap.addLayer(markersClusterGroup3);
	
					myMap.flyToBounds(coords, {padding: [30, 30]});
				}

				// CHeck if array is emtpy (same in wiki)
				if(result['data'].length == 0) {
					$("#noEarthquakesModal").modal({backdrop: false});
				}
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}
	});
}

function onClick(e) {
	e.target.getPopup().openOn(myMap);
}


function getPOI() {
	const center = myMap.getCenter();
	$.ajax({
		url: "./php/getPOI.php",
		type: 'POST',
		dataType: 'json',
		data: { 
			box: `{
				"boundingBox": {
					"ul": {
						"lat": ${center.lat + 2},
						"lng": ${center.lng + 2}
					},
					"lr": {
						"lat": ${center.lat - 2},
						"lng": ${center.lng - 2}
					}
				},
				"options": {}
			}`
		},
		success: function(result) {
			console.log(result);
			if (result.status.name == "ok") {
				// ExtraMarkers
				const poiMarker = L.ExtraMarkers.icon({
					icon: 'fa-map-marker-alt',
					iconColer: 'white',
					markerColor: 'black',
					shape: 'square',
					prefix: 'fa'
				});

				let coords = [];

				let markersClusterGroup4 = L.markerClusterGroup();

				if(result['data'].length > 0) {
					for(i = 0; i < result['data'].length; i++) {
					
						const lat = result['data'][i]['shapePoints'][0];
						const lng = result['data'][i]['shapePoints'][1];
						const name = result['data'][i]['name'];

						const address = result['data'][i]['fields']['address'];
						const city = result['data'][i]['fields']['city'];
						const phone = result['data'][i]['fields']['phone'];

						let html;

						// Define html to be included in pop up
						if(address && city && phone) {
							html = `<h5>Point of interest</h5>
								<table class="table">
									<tr>
										<td>Name: </td>
										<td>${name}</td>
									</tr>
									<tr>
										<td>Address: </td>
										<td>${address}</td>
									</tr>
									<tr>
										<td>City: </td>
										<td>${city}</td>
									</tr>
									<tr>
										<td>Phone: </td>
										<td>${phone}</td>
									</tr>
									<tr>
										<td>Latitude: </td>
										<td>${lat}</td>
									</tr>
									<tr>
										<td>Longitude: </td>
										<td>${lng}</td>
									</tr>
								</table>`;
						} else {
							html = `<h5>${name}</h5>
							<p>Latitude: ${lat}</p>
							<p>Longitude: ${lng}</p>
							<p>That's all the information we have about this point of interest. Places in North America have more information.</p>`;
						}
	
						coords[i] = [lat, lng];

						// Create markers and add content
						const marker = L.marker([lat, lng], {icon: poiMarker});
						marker.bindPopup(html).openPopup();
						// Set onClick handler for markers
						marker.on('click', onClick);
						
						// Add marker to cluster group
						markersClusterGroup4.addLayer(marker);
					}

					// Add cluster group to map
					myMap.addLayer(markersClusterGroup4);
	
					myMap.flyToBounds(coords, {padding: [30, 30]});
				}

				// CHeck if array is emtpy (same in wiki)
				if(result['data'].length == 0) {
					$("#noPOIsModal").modal({backdrop: false});
				}
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
			$("#noPOIsModal").modal({backdrop: false});
		}
	});
}



// getAddress is commented out because it so rarely returns an address!

// function getAddress() {
// 	var center = myMap.getCenter();
// 	console.log("lat is")
// 	console.log(center.lat);
// 	console.log("lng is")
// 	console.log(center.lng);

// 	$.ajax({
// 		url: "./php/getAddress.php",
// 		type: 'POST',
// 		dataType: 'json',
// 		data: {
// 			lat: center.lat,
// 			lng: center.lng
// 		},
// 		success: function(result) {
// 			console.log(result);
// 			if (result.status.name == "ok") {
// 				// ExtraMarkers

// 				console.log("Address success handler")
// 				var addressMarker = L.ExtraMarkers.icon({
// 					icon: 'fa-globe',
// 					iconColer: 'white',
// 					markerColor: 'black',
// 					shape: 'square',
// 					prefix: 'fa'
// 				});

// 				if(result['data']) {
// 					console.log("Address success handler if clause")
// 					var lat = result['data']['lat'];
// 					var lng = result['data']['lng'];

// 					var html = `<h5>Address</h5>
// 					<table class="table">
// 						<tr>
// 							<td>House Number: </td>
// 							<td>${result['data']['houseNumber']}</td>
// 						</tr>
// 						<tr>
// 							<td>Street: </td>
// 							<td>${result['data']['street']}</td>
// 						</tr>
// 						<tr>
// 							<td>Locality: </td>
// 							<td>${result['data']['locality']}</td>
// 						</tr>
// 						<tr>
// 							<td>Country Code: </td>
// 							<td>${result['data']['countryCode']}</td>
// 						</tr>
// 					</table>`;

// 					// Create markers and add content
// 					var marker = L.marker([lat, lng], {icon: addressMarker}).addTo(myMap);
// 					marker.bindPopup(html).openPopup();

// 					// Set onClick handler for markers
// 					marker.on('click', onClick);

// 					function onClick(e) {
// 						var popup = e.target.getPopup();
// 						var content = popup.getContent();
// 						console.log(content);
// 					}
					
// 					var latlng = L.latLng(lat, lng);
// 					myMap.flyTo(latlng);
// 				}

// 				// CHeck if array is emtpy (same in wiki)
// 				if(result['data'].length == 0) {
// 					$("#noAddressModal").modal({backdrop: false});
// 				}
// 			}
// 		},
// 		error: function(jqXHR, textStatus, errorThrown) {
// 			// Sometimes returns null so add pop up to say no weather info?
// 			console.log(textStatus);
// 		}
// 	});
// }

// onMapClick function
function onMapClick(e) {

	$.ajax({
		url: "./php/getWeather.php",
		type: 'POST',
		dataType: 'json',
		data: {
			lat: e.latlng.lat,
			lng: e.latlng.lng
		},
		success: function(result) {
			console.log(result);

			const html = `<table>
					<thead>
						<tr>
							<th>Metric</th>
							<th>Observation</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Latitude</td>
							<td>${e.latlng.lat.toFixed(2).toString()}</td>
						</tr>
						<tr>
							<td>Longitude</td>
							<td>${e.latlng.lng.toFixed(2).toString()}</td>
						</tr>
						<tr>
							<td>Clouds</td>
							<td>${result['data']['clouds']}</td>
						</tr>
						<tr>
							<td>Temperature</td>
							<td>${result['data']['temperature']} <sup>o</sup>C</td>
						<tr>
						<tr>
							<td>Humidity</td>
							<td>${result['data']['humidity']}%</td>
						</tr>
						<tr>
							<td>Wind speed</td>
							<td>${result['data']['windSpeed']}</td>
						</tr>
					</tbody>
				</table>`;

			if (result.status.name == "ok") {
				popup
					.setLatLng(e.latlng)
					.setContent(html)
					.openOn(myMap);
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			
			const html = `<p>Sorry, no weather info at this location. Try clicking somewhere else.</p>`;

			popup
					.setLatLng(e.latlng)
					.setContent(html)
					.openOn(myMap);
		}
	});
}
