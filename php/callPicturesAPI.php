<?php 

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

// Open curl session
$ch1 = curl_init();
curl_setopt($ch1, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);

// **** Pixabay API call ***
$url6 = 'https://pixabay.com/api/?key=19802514-eec0122116ec77d8cc62077c4&q=' . $_REQUEST['countryName'] . '&image_type=photo';
curl_setopt($ch1, CURLOPT_URL,$url6);
$result6=curl_exec($ch1);
curl_close($ch1);
$decode6 = json_decode($result6,true);	



$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";

if(isset($decode6)) {
	$output['data']['pictures'] = $decode6;
}


$output = json_encode($output);
echo $output;

?>