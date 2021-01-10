<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

$isoCode = $_REQUEST['isoCode'];

$url='http://api.geonames.org/countryInfoJSON?formatted=true&lang=en&country=' . $isoCode . '&username=alexblackmore&style=full';

// Open curl session
$ch1 = curl_init();
curl_setopt($ch1, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch1, CURLOPT_URL,$url);
$result=curl_exec($ch1);
curl_close($ch1);
$decode = json_decode($result,true);
$isoCode3 = $decode['geonames']['0']['isoAlpha3'];



$url2 = 'http://climatedataapi.worldbank.org/climateweb/rest/v1/country/mavg/tas/2020/2039/' . $isoCode3 . '.json';
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_URL,$url2);

$result2=curl_exec($ch2);
curl_close($ch2);
$decode2 = json_decode($result2,true);




$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";

if(isset($decode)) {
	$output['data']['temperatures'] = $decode2;
}


$output = json_encode($output);
echo $output;




?>