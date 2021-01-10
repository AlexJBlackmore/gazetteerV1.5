
<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

// Open geo.json file into a string
$countryDataStr =  file_get_contents("../json/countryBorders.geo.json");

// Decode that string into an array
$countryDataArr = json_decode($countryDataStr, true);

// Open currencies json file
$currenciesStr =  file_get_contents("../json/currencies.json");
// Decode that string into an array
$currenciesArr = json_decode($currenciesStr, true);


// Open curl session
$ch1 = curl_init();
curl_setopt($ch1, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);



// Make a variable which contains the iso code of the selected country
$isoCode;

// If request contains isoCode (i.e PHP file is being called from onChange selector)
// Then use that as the isoCode
// Otherwise use latlng to obtain isoCode (i.e. PHP file is being called on page load)
if(isset($_REQUEST['isoCode'])){
    $isoCode = $_REQUEST['isoCode'];
} else {
    $url1 = 'http://api.geonames.org/countryCodeJSON?lat=' . $_REQUEST['lat'] . '&lng=' . $_REQUEST['lng'] . '&username=alexblackmore';

    curl_setopt($ch1, CURLOPT_URL,$url1);
    $result1=curl_exec($ch1);

    $decode1 = json_decode($result1, true);
    $isoCode = $decode1['countryCode'];
}


// Make a variable which will contain the border of the selected country
$border;
foreach($countryDataArr['features'] as $key => $value){
    if($value['properties']['iso_a2'] == $isoCode){
        $border = $value;
    }
};


// **** countryInfo API call ***
// Obtain country info (includes bounding box)
$url2='http://api.geonames.org/countryInfoJSON?formatted=true&lang=en&country=' . $isoCode . '&username=alexblackmore&style=full';

curl_setopt($ch1, CURLOPT_URL,$url2);
$result2=curl_exec($ch1);

$decode2 = json_decode($result2,true);

$currencySymbol;
$currencyName;
$capitalName;

if(isset($decode2['geonames'])){

	$capitalName = $decode2['geonames'][0]['capital'];

	// Find currency name and symbol from json file
	foreach($currenciesArr as $key => $value) {
		if(strcmp($key, $decode2['geonames'][0]['currencyCode']) == 0) {
			$currencySymbol = $value['symbol'];
			$currencyName = $value['name'];
		}
	}
}

// Need to override it to have DC so that it doesn't give washington state!
if(strcmp($capitalName, 'Washington') == 0) {
	$capitalName = 'Washington DC';
}

// **** OpenWeatherMap call, not for weather but for coords of capital ***
$url3='api.openweathermap.org/data/2.5/weather?q=' . $capitalName . ',' . $isoCode . '&appid=736e6b327e871772440406fb5e486bd2';

curl_setopt($ch1, CURLOPT_URL,$url3);
$result3=curl_exec($ch1);

$decode3 = json_decode($result3,true);


curl_close($ch1);







$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";

if(isset($isoCode)) {
	$output['data']['isoCode'] = $isoCode;
}

if(isset($decode2['geonames'])) {
	$output['data']['countryInfo'] = $decode2['geonames'];
}

if(isset($border)) {
	$output['data']['border'] = $border;
}

if(isset($currencySymbol)) {
	$output['data']['currency']['symbol'] = $currencySymbol;
}

if(isset($currencyName)) {
	$output['data']['currency']['name'] = $currencyName;
}

if(isset($decode3)) {
	$output['data']['capital'] = $decode3;
}


$output = json_encode($output);
echo $output;


?>