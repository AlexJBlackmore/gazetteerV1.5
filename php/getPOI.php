
<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

$url='http://www.mapquestapi.com/search/v2/rectangle?key=WShTiuKNuOVpIuy0PSTkWiy5glMohZ8Y';

$body = $_REQUEST['box'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_URL,$url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $body); 
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain')); 

$result=curl_exec($ch);

curl_close($ch);

$decode = json_decode($result,true);	

$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
$output['data'] = $decode['searchResults'];

// header('Content-Type: application/json; charset=UTF-8');

echo json_encode($output); 

?>
