<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

$isoCode = $_REQUEST['isoCode'];
$north = $_REQUEST['north'];
$south = $_REQUEST['south'];
$east = $_REQUEST['east'];
$west = $_REQUEST['west'];

// Open curl session
$ch1 = curl_init();
curl_setopt($ch1, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);

// Obtain earthquakes within bounding box
$url3='http://api.geonames.org/earthquakesJSON?north=' . $north . '&south=' . $south . '&east=' . $east . '&west=' . $west . '&username=alexblackmore&style=full';

curl_setopt($ch1, CURLOPT_URL,$url3);
$result3=curl_exec($ch1);

$decode3 = json_decode($result3,true);

// *** Strip out earthquakes that weren't in country ***
// Step1. Create array for ones which are in country
$withinCountry = array();
$length = count($decode3['earthquakes']);

// Step 2. Loop through earthquakes, call countryCodeJSON api for each one
for ($i = 0; $i < $length; $i++) {		
    $urlTemp = 'http://api.geonames.org/countryCodeJSON?lat=' . $decode3['earthquakes'][$i]['lat'] . '&lng=' . $decode3['earthquakes'][$i]['lng'] . '&username=alexblackmore';
    
    curl_setopt($ch1, CURLOPT_URL, $urlTemp);
    $resultTemp = curl_exec($ch1);

    $decodeTemp = json_decode($resultTemp, true);

    // Sometimes the countryCode field comes back as empty so check first that it's set
    if(isset($decodeTemp['countryCode'])) {
        // Step 3. Check if the country code returned matches the original isoCode in the $isoCode variable
        // If it does, add to array
        if(strcmp($decodeTemp['countryCode'], $isoCode) == 0) {
            $withinCountry[] = $decode3['earthquakes'][$i];
        } else {
            // echo 'This earthquake was not in ' . $isoCode . ', it was in ' . $decodeTemp['countryCode'];
        }
    }
}

$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
$output['data']['earthquakes'] = $withinCountry;

$output = json_encode($output);
echo $output;

?>