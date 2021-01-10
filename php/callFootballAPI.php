<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

$isoCode = $_REQUEST['isoCode'];





// *** Football API call ***
// Requires 2 calls. First to get country names
// (can't use countryNames from countryInfo call because
// football API requires England, Scotland, as opposed to United Kingdom
// Then second to get teams of each of the combined countries

$url9 = 'https://v3.football.api-sports.io/countries';
$ch9 = curl_init();
curl_setopt($ch9, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch9, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch9, CURLOPT_URL,$url9);
curl_setopt($ch9, CURLOPT_HTTPHEADER, array(
    'x-rapidapi-key: c9d5118dae9b4a74bb934b9073258b2f'
));
$result9 = curl_exec($ch9);
curl_close($ch9);
$decode9 = json_decode($result9,true);

// Create array and loop through countries, adding to array if they match the isoCode
$combinedCountries = array();
$length9 = count($decode9['response']);
for ($i = 0; $i < $length9; $i++) {
	if(strcmp($decode9['response'][$i]['code'], $isoCode) == 0) {
		$combinedCountries[] = $decode9['response'][$i]['name'];
	}
}

// Loop through array and call API for each country
$decode10 = array();
$length10 = count($combinedCountries);
for ($i = 0; $i < $length10; $i++) {
	$url10 = 'https://v3.football.api-sports.io/teams/?country=' . $combinedCountries[$i];
	$ch10 = curl_init();
	curl_setopt($ch10, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch10, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch10, CURLOPT_URL,$url10);
	curl_setopt($ch10, CURLOPT_HTTPHEADER, array(
		'x-rapidapi-key: c9d5118dae9b4a74bb934b9073258b2f'
	));
	$result10 = curl_exec($ch10);
	curl_close($ch10);
	$decode10[] = json_decode($result10,true);	
}


$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";


if(isset($decode10)) {
	$output['data']['football'] = $decode10;
}


$output = json_encode($output);
echo $output;



?>