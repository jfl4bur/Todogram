<?php
// Archivo de prueba para verificar que PHP funciona
echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>PHP Test</title></head><body>";
echo "<h1>✅ PHP está funcionando correctamente</h1>";
echo "<p>Versión de PHP: " . phpversion() . "</p>";
echo "<h2>Parámetros recibidos:</h2>";
echo "<pre>";
print_r($_GET);
echo "</pre>";
echo "<h2>Variables de servidor:</h2>";
echo "<ul>";
echo "<li>HTTP_HOST: " . $_SERVER['HTTP_HOST'] . "</li>";
echo "<li>REQUEST_URI: " . $_SERVER['REQUEST_URI'] . "</li>";
echo "<li>SERVER_SOFTWARE: " . $_SERVER['SERVER_SOFTWARE'] . "</li>";
echo "</ul>";
echo "</body></html>";
?>
