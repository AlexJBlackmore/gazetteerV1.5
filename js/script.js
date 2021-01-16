let map;
let borderFeatureGroup;
let earthquakesClusterGroup;
let wikisClusterGroup;
let POIsClusterGroup;
let popup;
let json;

$(window).on('load', async function () {   
	
	// Hide spinner if div loaded
	if ($('#preloader').length) {      
		$('#preloader').delay(100).fadeOut('slow', function () {        
			$(this).remove();      
		});    
	}

	
	// Create map
	const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	map = L.map('mapid').setView([40, 0], 3);
	L.tileLayer(tileUrl, { minZoom: 3, noWrap: true, attribution: attribution}).addTo(map);

	// Set max bounds of map so that you can't see grey space
	const southWest = L.latLng(-89.98155760646617, -180);
	const northEast = L.latLng(89.99346179538875, 180);
	const bounds = L.latLngBounds(southWest, northEast);
	map.setMaxBounds(bounds);
	map.on('drag', function() {
		map.panInsideBounds(bounds, { animate: false });
	});

	// Populate country selector
	$.ajax({
		url: "./php/parseJson.php",
		dataType: 'json',
		success: function(result) {
			
			console.log("Looksd here!");
			console.log(result);
			for (i = 0; i < result['data'].length; i++) {
				if(result['data'][i]['name'] == "Kosovo") {
					// Don't add Kosovo to select because it has a number as an iso code!
					continue;
				}
				$('#countrySelect').append($('<option>', {value:result['data'][i]['isoCode'], text:result['data'][i]['name']}));
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			alert("ParseJSON - the following error occured: " + jqXHR.status + " " + textStatus);
		}
	});

	// Set options for geting user location
	const options = {
		enableHighAccuracy: true,
		timeout: 20000,
		maximumAge: 0
	}

	// Get user location
	navigator.geolocation.getCurrentPosition(getPosSuccess, getPosError, options);

	// Set on change/click handlers
	$('#countrySelect').on('change', changeCountry);
	$('#teamsSelect').on('change', teamSelectChange);
	$('#closeTeamsBtn').on('click', clearTeam);
	$('#howToUse').on('click', displayHowToUse);

	// Hide the spinner in the teamsModal
	$('#teamsSpinner').hide();
	
	// Add buttons to map
	L.easyButton('fa-camera', displayImages,'View photos of this country').addTo(map);
	L.easyButton('fa-temperature-low', displayTemperatures,'View monthly temperature variation in this country').addTo(map);
	L.easyButton('fa-futbol', displayTeams,'View football teams in this country').addTo(map);
	L.easyButton('fa-cloud-sun', displayCapitalWeather,'View the weather at the capital of this country').addTo(map);
	L.easyButton('fa-info', showCountryInfoModal,'View information about this country').addTo(map);

	// Create pop up for the on map click and set the click handler
	popup = L.popup();
	map.on('click', onMapClick);

});

// Function called when select is changed
async function changeCountry() {
	map.spin(true);

	// Get isoCode from select
	const isoCode = $('#countrySelect').val();
	
	// Call APIs with it
	const data = await getBorderAndCountryInfoIso(isoCode);

	// Remove existing clustergroups
	if(earthquakesClusterGroup){
        map.removeLayer(earthquakesClusterGroup);
	}
	if(wikisClusterGroup){
        map.removeLayer(wikisClusterGroup);
	}

	plotBorder(data);
	displayModal(data);
	showCapitalWeather(data['capital']['coord']);

	const wikisData = await callWikisAPI(data['countryInfo'][0]);
	addWikiMarkers(wikisData);

	const earthquakesData = await callEarthquakesAPI(data['countryInfo'][0]);
	addEarthquakeMarkers(earthquakesData);
	
	map.spin(false);
}

// Function to get earthquakes
// In a separate call to other API calls because it takes longer
// This call can run in background while user is busy looking at modal
function callEarthquakesAPI(countryInfo) {
	const north = countryInfo['north'];
	const south = countryInfo['south'];
	const east = countryInfo['east'];
	const west = countryInfo['west'];
	const isoCode = countryInfo['countryCode'];

	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callEarthquakesAPI.php",
			type: 'POST',
			dataType: 'json',
			data: {
				north: north,
				south: south,
				east: east,
				west: west,
				isoCode: isoCode
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				
			}
		}); 
	});
}

function callFootballAPI(isoCode) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callFootballAPI.php",
			type: 'POST',
			dataType: 'json',
			data: {
				isoCode: isoCode
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				
			}
		}); 
	});
}

function callWikisAPI(countryInfo) {
	const north = countryInfo['north'];
	const south = countryInfo['south'];
	const east = countryInfo['east'];
	const west = countryInfo['west'];
	const isoCode = countryInfo['countryCode'];

	console.log(`North is ${north} - south is ${south} - east is ${east}  -west is ${west}`);

	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callWikisAPI.php",
			type: 'POST',
			dataType: 'json',
			data: {
				north: north,
				south: south,
				east: east,
				west: west,
				isoCode: isoCode
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				
			}
		}); 
	});
}

// Plot border function
function plotBorder(data) {
	
	// Variable for border geojson
	const border = data['border'];
	// borderFeatureGroup is defined at start of file (global)
	// If border already set then remove
	if(borderFeatureGroup){
        map.removeLayer(borderFeatureGroup);
	}
	// Set borderFeaturegroup to the geoJson and pan to that area
    borderFeatureGroup = L.geoJSON(border).addTo(map);
	map.fitBounds(borderFeatureGroup.getBounds());
}

async function showCountryInfoModal() {
	map.spin(true);
	const isoCode = $('#countrySelect').val()
	const data = await getBorderAndCountryInfoIso(isoCode);
	displayModal(data);
	map.spin(false);
}

// Pop up modal function
function displayModal(data) {
	// Extract values from response into variables
	const countryName = data['countryInfo'][0]['countryName'];
	const capital = data['countryInfo'][0]['capital'];
	const population = data['countryInfo'][0]['population'];
	const area = data['countryInfo'][0]['areaInSqKm'];
	let languages = data['countryInfo'][0]['languages'];
	if(languages.length > 25) {
		// Reduce string length so it doesn't overflow
		languages = languages.substring(0, 24);
	}
	const isoCode = data['countryInfo'][0]['countryCode'];
	// Use currency code as fallback value for currency
	let currency = data['countryInfo'][0]['currencyCode'];
	// Use values from currency property if possible
	if(data['currency']) {
		currency = `${data['currency']['name']} (${data['currency']['symbol']})`;
	}

	// Set modal html
	$('#modalTitle').html(countryName);
	$('#capitalCell').html(capital);
	$('#currencyCell').html(currency);
	$('#populationCell').html(new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(population));
	$('#areaCell').html(new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(area));
	$('#languagesCell').html(languages);
	$('#countryFlag').attr('src', `https://www.countryflags.io/${isoCode}/flat/64.png`);

	// Trigger modal
	$("#myModal").modal({backdrop: false});
}

// Populate modal and display
async function displayImages() {
	const countryName = $("#countrySelect option:selected").text();
	const picturesData = await callPicturesAPI(countryName);

	$('#imagesModalTitle').html(countryName);

	$("#slide1").attr("src", picturesData['pictures']['hits'][0]['largeImageURL']);
	$("#slide2").attr("src", picturesData['pictures']['hits'][1]['largeImageURL']);
	$("#slide3").attr("src", picturesData['pictures']['hits'][2]['largeImageURL']);
	$("#slide4").attr("src", picturesData['pictures']['hits'][3]['largeImageURL']);
	$("#slide5").attr("src", picturesData['pictures']['hits'][4]['largeImageURL']);

	$('#imagesModal').modal({backdrop: false});
}

// Add Earthquake markers function
function addEarthquakeMarkers(earthquakesData) {

	// Variable to store earthquakes array
	let earthquakes = null;
	// Length of array
	let earthquakesLength = null;

	// First check if there are actually earthquakes in the response
	if(earthquakesData['earthquakes']){
		earthquakes = earthquakesData['earthquakes'];
		earthquakesLength = earthquakes.length

		// Create array for all coords of earthquakes
		let earthquakesCoords = [];
		// Create a clusergroup for earthquakes
		earthquakesClusterGroup = L.markerClusterGroup();

		for(i = 0; i < earthquakesLength; i++) {
			
			// Extract values from each earthquake in earthquakes API call
			const lat = earthquakes[i]['lat'];
			const lng = earthquakes[i]['lng'];
			const date = earthquakes[i]['datetime'].substring(0, 10);
			const time = earthquakes[i]['datetime'].substring(11, 19);
			const depth = earthquakes[i]['depth'];
			const magnitude = earthquakes[i]['magnitude'];

			// Add lat lng to coords array
			earthquakesCoords[i] = [lat, lng];

			// Create markers and add content
			const earthquakeIcon = L.ExtraMarkers.icon({
				icon: 'fa-bolt',
				iconColor: 'white',
				markerColor: 'orange-dark',
				shape: 'square',
				prefix: 'fa'
			});
			const marker = L.marker([lat, lng], {icon: earthquakeIcon});

			const html = `<div class="card-body">
				<h5 class="card-title text-center">There was an earthquake here!</h5>
				<br><h3 class="card-subtitle mb-2 text-center">${magnitude} magnitude</h3>
				<h3 class="card-subtitle mb-2 text-center">${depth}km depth</h3>
				<br><h6 class="card-subtitle mb-2 text-muted text-center">At <strong>${time}</strong> on  <strong>${date}</strong></h6>
				<p class="card-text text-center">This location is ${lat.toFixed(4).toString()}, ${lng.toFixed(4).toString()}. 
					Learn more about how earthquakes are recorded
					<a href="https://www.usgs.gov/natural-hazards/earthquake-hazards/science/science-earthquakes?qt-science_center_objects=0#qt-science_center_objects" target="_blank">here.</a></p>
			</div>`;

			// Bind html to popup
			marker.bindPopup(html);
			// Assign pop up onclick listener
			marker.on('click', onClick);
			// Add marker to cluster group
			earthquakesClusterGroup.addLayer(marker);
		}

		// Add cluster group to map
		map.addLayer(earthquakesClusterGroup);
	}
}

// Add Wiki markers function
function addWikiMarkers(data) {
	// Variable to store wikis array
	let wikis = null;
	// Length of array
	let wikisLength = null;
	// First check if there are actually earthquakes in the response
	if(data['wikis']){
		wikis = data['wikis'];
		wikisLength = wikis.length

		// Create array for all coords of earthquakes
		let wikisCoords = [];
		// Create a clusergroup for earthquakes
		wikisClusterGroup = L.markerClusterGroup();

		for(i = 0; i < wikisLength; i++) {
			// Extract values from each earthquake in earthquakes API call
			const lat = wikis[i]['lat'];
			const lng = wikis[i]['lng'];
			const summary = wikis[i]['summary'];
			const title = wikis[i]['title'];
			const wikiUrl = wikis[i]['wikipediaUrl'];
			const wikiImage = wikis[i]['thumbnailImg'];

			// Add lat lng to coords array
			wikisCoords[i] = [lat, lng];

			// Create markers
			const wikiIcon = L.ExtraMarkers.icon({
				icon: 'fa-binoculars',
				iconColor: 'white',
				markerColor: 'blue',
				shape: 'square',
				prefix: 'fa'
			});
			const marker = L.marker([lat, lng], {icon: wikiIcon});

			// Html to be included in pop up
			let html;
			if(wikiImage) {
				html = `<div class="card-body">
					<h3 class="card-subtitle mb-2 text-center">${title}</h3>
					<p class="text-center">${summary}</p>
					<div style="text-align: center">
					<img src="${wikiImage}" alt="${summary}" class="img-fluid"/>
					<br>
					<br>
					<a href="https://${wikiUrl}">View Wikipedia article</a>
					</div>
				</div>`;
			} else {
				html = `<div class="card-body">
					<h3 class="card-subtitle mb-2 text-center">${title}</h3>
					<p class="text-center">${summary}</p>
					<div style="text-align: center">
					<br>
					<br>
					<a href="https://${wikiUrl}">View Wikipedia article</a>
					</div>
				</div>`;
			}

			// Bind html to popup
			marker.bindPopup(html);
			// Assign pop up onclick listener
			marker.on('click', onClick);
			// Add marker to cluster group
			wikisClusterGroup.addLayer(marker);
		}

		// Add cluster group to map
		map.addLayer(wikisClusterGroup);
	}
}

// Marker onclick function
function onClick(e) {
	e.target.getPopup().openOn(map);
}

// Navigator success handler
async function getPosSuccess(pos) {
	map.spin(true);
		
	// Make a variable for coords
	const crd = pos.coords;
	
	// Call the APIs
	const data = await getBorderAndCountryInfoLatLng(crd.latitude, crd.longitude);

	$("#countrySelect").val(data['isoCode']);

	plotBorder(data);
	displayModal(data);

	showCapitalWeather(data['capital']['coord']);

	const wikisData = await callWikisAPI(data['countryInfo'][0]);
	addWikiMarkers(wikisData);

	const earthquakesData = await callEarthquakesAPI(data['countryInfo'][0]);
	addEarthquakeMarkers(earthquakesData);

	map.spin(false);
}

// Navigator error handler
async function getPosError(err) {
	map.spin(true);

	// Use GB as default if no user location provided
	const data = await getBorderAndCountryInfoIso('GB');

	$("#countrySelect").val(data['isoCode']);
	
	plotBorder(data);
	displayModal(data);
	showCapitalWeather(data['capital']['coord']);

	const wikisData = await callWikisAPI(data['countryInfo'][0]);
	addWikiMarkers(wikisData);

	const earthquakesData = await callEarthquakesAPI(data['countryInfo'][0]);
	addEarthquakeMarkers(earthquakesData);

	map.spin(false);
}

// callPicturesAPI function
function callPicturesAPI(countryName) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callPicturesAPI.php",
			type: 'POST',
			dataType: 'json',
			data: {
				countryName: countryName
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
			}
		}); 
	});
}









// Populate modal and display
async function displayTeams() {
	map.spin(true);
	const isoCode = $("#countrySelect").val();
	const data = await callFootballAPI(isoCode);

	let teamsData = [];
	let teamNames = [];

	// Requires loop in a loop because some responses have multiple countries
	// Eg United Kingdom contains England, Scotland, Wales, Northern Ireland
	for(i = 0; i < data['football'].length; i++) {
		
		const teamsArray = data['football'][i]['response'];

		for(j = 0; j < teamsArray.length; j++) {
			teamsData.push({
				"teamName": teamsArray[j]['team']['name'],
				"teamCountry": teamsArray[j]['team']['country'],
				"teamLogo": teamsArray[j]['team']['logo'],
				"founded": teamsArray[j]['team']['founded'],
				"address": teamsArray[j]['venue']['address'],
				"capacity": teamsArray[j]['venue']['capacity'],
				"image": teamsArray[j]['venue']['image'],
				"venueName": teamsArray[j]['venue']['name'],
				"city": teamsArray[j]['venue']['city']
			});

			teamNames.push(teamsArray[j]['team']['name']);
		}
	}
	
	// Sort the teamNames before adding to the select
	teamNames.sort();
	for(i = 0; i < teamNames.length; i++) {
		$('#teamsSelect').append($('<option>', {value:teamNames[i], text:teamNames[i]}));
	}

	if(teamsData.length == 0) {
		$('#teamLogo').hide();
		$('#stadiumImage').hide();
		$('#teamsSelect').hide();
		$('#foundedIn').html('No teams found for this country. Try selecting a different one.');
	}

	// Set the initially selected team as the first one with images
	for(i = 0; i < teamsData.length; i++) {
		if(teamsData[i]['image'] && teamsData[i]['teamLogo'] && teamsData[i]['founded'] && teamsData[i]['venueName'] && teamsData[i]['teamName']) {
			$("#teamLogo").attr("src", teamsData[i]['teamLogo']);
			$("#stadiumImage").attr("src", teamsData[i]['image']);
			$('#teamName').html(teamsData[i]['teamName']);
			$('#foundedIn').html(`This club was founded in ${teamsData[i]['founded']} and currently play at: <strong>${teamsData[i]['venueName']}.</strong>`);
			$("#teamsSelect").val(teamsData[i]['teamName']);
			break;
		}
	}

	// Set the modal title
	$('#teamsModalTitle').html(`Football teams in ${$("#countrySelect option:selected").text()}`);

	$('#teamsModal').modal({backdrop: false});
	map.spin(false);
}

function clearTeam() {
	// Clear the team selector
	$("#teamsSelect").empty();
	// Empty the existing card
	$("#teamLogo").attr("src", '');
	$("#stadiumImage").attr("src", '');
	$('#teamName').html('');
	$('#foundedIn').html('');

	$("#teamsSelect").show();
	$("#teamLogo").show();
	$("#stadiumImage").show();
	$('#teamName').show();
	$('#foundedIn').show();

}

// Team select on change
async function teamSelectChange() {
	$('#teamsSpinner').show();
	$("#teamLogo").attr("src", '');
	$("#teamLogo").attr("alt", '');
	$("#teamLogo").hide();
	$("#stadiumImage").hide();
	$("#stadiumImage").attr("src", '');
	$("#stadiumImage").attr("alt", '');
	$('#teamName').html('');
	$('#foundedIn').html('');
	
	const isoCode = $("#countrySelect").val();
	const data = await callFootballAPI(isoCode);

	let teamsData = [];
	let teamNames = [];

	// Requires loop in a loop because some responses have multiple countries
	// Eg United Kingdom contains England, Scotland, Wales, Northern Ireland
	for(i = 0; i < data['football'].length; i++) {
		
		const teamsArray = data['football'][i]['response'];

		for(j = 0; j < teamsArray.length; j++) {
			teamsData.push({
				"teamName": teamsArray[j]['team']['name'],
				"teamCountry": teamsArray[j]['team']['country'],
				"teamLogo": teamsArray[j]['team']['logo'],
				"founded": teamsArray[j]['team']['founded'],
				"address": teamsArray[j]['venue']['address'],
				"capacity": teamsArray[j]['venue']['capacity'],
				"image": teamsArray[j]['venue']['image'],
				"venueName": teamsArray[j]['venue']['name'],
				"city": teamsArray[j]['venue']['city']
			});

			teamNames.push(teamsArray[j]['team']['name']);
		}
	}
	$('#teamsSpinner').hide();

	for(i=0; i < teamsData.length; i++) {
		if($('#teamsSelect').val() == teamsData[i]['teamName']) {
			const image = teamsData[i]['image'];
			const teamLogo = teamsData[i]['teamLogo'];
			const founded = teamsData[i]['founded'];
			const venueName = teamsData[i]['venueName'];
			const teamName = teamsData[i]['teamName'];
			const imgNotAvail = 'https://media.api-sports.io/football/teams/8735.png';
			const imgNotAvail2 = 'https://media.api-sports.io/football/venues/7437.png';
			const imgNotAvail3 = 'https://media.api-sports.io/football/venues/7754.png';
			const imgNotAvail4 = 'https://media.api-sports.io/football/venues/4946.png';
			const imgNotAvail5 = 'https://media.api-sports.io/football/teams/6736.png';
			const imgNotAvail6 = 'https://media.api-sports.io/football/teams/11335.png';
			const imgNotAvail7 = 'https://media.api-sports.io/football/teams/8771.png';
			const imgsNotAvail = [imgNotAvail, imgNotAvail2, imgNotAvail3, imgNotAvail4, imgNotAvail5, imgNotAvail6, imgNotAvail7];
			
			$("#teamLogo").show();
			$("#stadiumImage").show();
			$('#teamName').html(teamsData[i]['teamName']);
			$("#teamLogo").attr("src", teamLogo);
			$("#stadiumImage").attr("src", image);
			$('#foundedIn').html(`This club was founded in ${founded} and currently play at: <strong>${venueName}.</strong>`);
			

			if(!image || imgsNotAvail.includes(image)) {
				$("#stadiumImage").hide();
				$("#stadiumImage").attr("alt", '');
			}

			if(!teamLogo || imgsNotAvail.includes(teamLogo)) {
				$("#teamLogo").hide();
				$("#teamLogo").attr("alt", '');
			}

			if(founded && venueName) {
				$('#foundedIn').html(`This club was founded in ${founded} and currently play at: <strong>${venueName}.</strong>`);
			}

			if(!founded && venueName) {
				$('#foundedIn').html(`This club currently play at: <strong>${venueName}.</strong>`);
			}

			if(founded && !venueName) {
				$('#foundedIn').html(`This club was founded in ${founded}.`);
			}

			if(!founded && !venueName) {
				$('#foundedIn').html(`There is not much information about this club. Try selecting another.`);
			}
		}
	}
}




// Pictures API has to be GET not POST
function callTemperaturesAPI(isoCode) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callTemperaturesAPI.php",
			type: 'GET',
			dataType: 'json',
			data: {
				isoCode: isoCode
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				
			}
		}); 
	});
}

// Populate modal and display
async function displayTemperatures() {
	map.spin(true);
	const isoCode = $("#countrySelect").val();
	const temperaturesData = await callTemperaturesAPI(isoCode);

	let temperatures = [];
	let months = [];
	const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

	for(i = 0; i < temperaturesData['temperatures'][0]['monthVals'].length; i++) {
		temperatures[i] = temperaturesData['temperatures'][0]['monthVals'][i];
		months[i] = monthNames[i];
	}

	var ctx = document.getElementById('temperaturesChart').getContext('2d');
	var myChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: months,
			datasets: [{
				label: 'Month average',
				data: temperatures,
				fill: false,
				backgroundColor: 'rgba(220,180,0,1)',
				borderColor: 'rgba(220,180,0,1)',
				borderWidth: 1
			}]
		},
		options: {
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero: true
					}, 
					scaleLabel: {
						display: true,
						labelString: 'Celcius'
					}
				}]
			}
		}
	});

	$('#temperaturesModalTitle').html(`${$("#countrySelect option:selected").text()} climate`);
	$('#temperaturesModal').modal({backdrop: false});
	map.spin(false);
}

// callAPIs can take lat lng as params or isoCode
function getBorderAndCountryInfoLatLng(lat, lng) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/getBorderAndCountryInfo.php",
			type: 'POST',
			dataType: 'json',
			data: {
				lat: lat,
				lng: lng
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
			}
		}); 
	});
}

//callAPIs can take lat lng as params or isoCode
function getBorderAndCountryInfoIso(isoCode) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/getBorderAndCountryInfo.php",
			type: 'POST',
			dataType: 'json',
			data: {
				isoCode: isoCode
			},
			success: function(result) {
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
			}
		}); 
	});
}

async function displayCapitalWeather() {
	map.spin(true);
	const isoCode = $('#countrySelect').val()
	const data = await getBorderAndCountryInfoIso(isoCode);
	showCapitalWeather(data['capital']['coord']);
	map.spin(false);
}

function showCapitalWeather(coords) {

	const lat = coords['lat'];
	const lng = coords['lon'];

	// Note the OpenWeather Pollution API requires GET requests (doesnt accept POST)
	$.ajax({
		url: "./php/getWeather.php",
		type: 'GET',
		dataType: 'json',
		data: {
			lat: lat,
			lng: lng
		},
		success: function(result) {
			const date = result['data']['weather']['datetime'].substring(0, 10);
			const time = result['data']['weather']['datetime'].substring(11, 19);
			const clouds = capitalizeFirstLetter(result['data']['weather']['clouds']);

			const html = `<div class="card-body">
					<h5 class="card-title text-center">Weather at ${lat.toFixed(4).toString()}, ${lng.toFixed(4).toString()}</h5>
					<br><h3 class="card-subtitle mb-2 text-center" id="clouds">${clouds}</h3>
					<h3 class="card-subtitle mb-2 text-center">${result['data']['weather']['temperature']} <sup>o</sup>C</h3>
					<br><h6 class="card-subtitle mb-2 text-muted text-center">${result['data']['weather']['stationName']} weather station</h6>
					<p class="card-text text-center">With ${result['data']['weather']['humidity']}% humidity and winds of ${result['data']['weather']['windSpeed']} km/h.
					This reading was taken at ${time} on ${date}.</p>
					<div class="text-center">
					<button onclick="displayChart()" type="button" class="btn btn-primary"">View pollution forecast</button>
					</div>
				</div>`;

			if (result.status.name == "ok") {
				popup
					.setLatLng([lat, lng])
					.setContent(html)
					.openOn(map);
			}

			json = result['data']['pollution'];
		},
		error: function(jqXHR, textStatus, errorThrown) {
			
			const html = `<p>Sorry, no weather info at this location. Try clicking somewhere else.</p>`;

			popup
					.setLatLng([lat, lng])
					.setContent(html)
					.openOn(map);
		}
	});
}


// onMapClick function
function onMapClick(e) {

	// Note the OpenWeather Pollution API requires GET requests (doesnt accept POST)
	$.ajax({
		url: "./php/getWeather.php",
		type: 'GET',
		dataType: 'json',
		data: {
			lat: e.latlng.lat,
			lng: e.latlng.lng
		},
		success: function(result) {

			const date = result['data']['weather']['datetime'].substring(0, 10);
			const time = result['data']['weather']['datetime'].substring(11, 19);
			const clouds = capitalizeFirstLetter(result['data']['weather']['clouds']);

			const html = `<div class="card-body">
					<h5 class="card-title text-center">Weather at ${e.latlng.lat.toFixed(4).toString()}, ${e.latlng.lng.toFixed(4).toString()}</h5>
					<br><h3 class="card-subtitle mb-2 text-center" id="clouds">${clouds}</h3>
					<h3 class="card-subtitle mb-2 text-center">${result['data']['weather']['temperature']} <sup>o</sup>C</h3>
					<br><h6 class="card-subtitle mb-2 text-muted text-center">${result['data']['weather']['stationName']} weather station</h6>
					<p class="card-text text-center">With ${result['data']['weather']['humidity']}% humidity and winds of ${result['data']['weather']['windSpeed']} km/h.
					This reading was taken at ${time} on ${date}.</p>
					<div class="text-center">
					<button onclick="displayChart()" type="button" class="btn btn-primary"">View pollution forecast</button>
					</div>
				</div>`;

			if (result.status.name == "ok") {
				popup
					.setLatLng(e.latlng)
					.setContent(html)
					.openOn(map);
			}

			json = result['data']['pollution'];
		},
		error: function(jqXHR, textStatus, errorThrown) {
			
			const html = `<p>Sorry, no weather info at this location. Try clicking somewhere else.</p>`;

			popup
					.setLatLng(e.latlng)
					.setContent(html)
					.openOn(map);
		}
	});
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function timeConverter(UNIX_timestamp){
	var a = new Date(UNIX_timestamp * 1000);

	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var month = months[a.getMonth()];
	var date = a.getDate();
	var hour = a.getHours();
	var time = date + ' ' + month + ' ' + hour + ':00';
	return time;
}

function displayHowToUse() {
	$('#howToUseModal').modal({backdrop: false});
}

function displayChart() {
	drawChart();
	$('#chartModalTitle').html(`Forecast for ${json['coord']['lat'].toFixed(2)}, ${json['coord']['lon'].toFixed(2)}`);
	$('#chartModal').modal({backdrop: false});
}

function drawChart() {
	let timestamps = [];
	let coPollution = [];
	let no2Pollution = [];
	let o3Pollution = [];

	for(i = 0; i < json['list'].length; i++) {
		const dateTimeStr = timeConverter(json['list'][i]['dt'])
		timestamps[i] = dateTimeStr;
		coPollution[i] = json['list'][i]['components']['co'];
		no2Pollution[i] = json['list'][i]['components']['no2'];
		o3Pollution[i] = json['list'][i]['components']['o3'];
	}

	var ctx = document.getElementById('myChart').getContext('2d');
	var myChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: timestamps,
			datasets: [{
				label: 'CO',
				data: coPollution,
				fill: false,
				backgroundColor: 'rgba(0,0,255,1)',
				borderColor: 'rgba(0,0,255,1)',
				borderWidth: 1
			}, {
				label: 'NO2',
				data: no2Pollution,
				fill: false,
				backgroundColor: 'rgba(0,255,0,1)',
				borderColor: 'rgba(0,255,0,1)',
				borderWidth: 1
			}, {
				label: 'O3',
				data: o3Pollution,
				fill: false,
				backgroundColor: 'rgba(255,0,0,1)',
				borderColor: 'rgba(255,0,0,1)',
				borderWidth: 1
			}]
		},
		options: {
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero: true
					},
					scaleLabel: {
						display: true,
						labelString: 'μg/m3'
					}
				}],
				xAxes: [{
					ticks: {
						autoSkip: true,
						maxTicksLimit: 6
					}
				}]
			}
		}
	});
}
