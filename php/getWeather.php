
<?php

	ini_set('display_errors', 'On');
	error_reporting(E_ALL);

	$executionStartTime = microtime(true) / 1000;

	$url='http://api.geonames.org/findNearByWeatherJSON?lat=' . $_REQUEST['lat'] . '&lng=' . $_REQUEST['lng'] . '&username=alexblackmore';

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);

	$result=curl_exec($ch);
	curl_close($ch);
	
	$apiKey = '736e6b327e871772440406fb5e486bd2';
	$url2 = 'http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=' . $_REQUEST['lat'] . '&lon=' . $_REQUEST['lng'] .'&appid=' . $apiKey;
	$ch2 = curl_init();
	curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch2, CURLOPT_URL,$url2);

	$result2=curl_exec($ch2);
	curl_close($ch2);

	$decode = json_decode($result,true);	
	$decode2 = json_decode($result2,true);

	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "mission saved";
	$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
	$output['data']['weather'] = $decode["weatherObservation"];
	$output['data']['pollution'] = $decode2;
	

	echo json_encode($output); 

?>
