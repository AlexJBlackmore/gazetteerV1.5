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

$url5 = 'http://api.geonames.org/wikipediaBoundingBoxJSON?north=' . $north . '&south=' . $south . '&east=' . $east . '&west=' . $west . '&maxRows=50&username=alexblackmore';

curl_setopt($ch1, CURLOPT_URL,$url5);
$result5=curl_exec($ch1);
curl_close($ch1);
$decode5 = json_decode($result5,true);	

$length3;
$withinCountry3 = array();
if(isset($decode5['geonames'])) {
	$length3 = count($decode5['geonames']);
	// Loop through wikis, add to array if isoCode matches original variable isocode
	for ($i = 0; $i < $length3; $i++) {
		// Check if countryCode is set first because sometimes it's empty
		if(isset($decode5['geonames'][$i]['countryCode'])) {
			if(strcmp($decode5['geonames'][$i]['countryCode'], $isoCode) == 0) {
                $withinCountry3[] = $decode5['geonames'][$i];
			} else {
				// echo 'This wiki does not belong to ' . $isoCode . 'it belongs to ' . $decode5['geonames'][$i]['countryCode'];
			}
		}		
	}
}

$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
$output['data']['wikis'] = $withinCountry3;

$output = json_encode($output);
echo $output;

?>