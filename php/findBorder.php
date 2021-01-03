<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true) / 1000;

    $countryNamesStr =  file_get_contents("../json/countryBorders.geo.json");
  
    $json_arr = json_decode($countryNamesStr, true);

    // print_r($json_arr);

    $countrycode = $_REQUEST['isoCode'];
    $data;

    foreach($json_arr['features'] as $key => $value){
        if($value['properties']['iso_a2'] == $countrycode){
            $data = $value;
        }
    };

    $output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "mission saved";
	$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
    $output['data'] = $data;

    $output = json_encode($output);
    echo $output;


?>