// gestion de la carte
import {Geo} from './inc/geo.js'
//Gestion du bouton d'installation

//gestion des fermetures des boxes
import boxClose from './inc/box.js'
import installApp from './inc/install.js'
//lance le process d'installation de l'app

// end install

//sélection des éléments HTML
const $mapBox = document.querySelector('#map')

const myGeo = new Geo($mapBox)
myGeo.init()
// Gestion du curseur de distance
const $distanceRange = document.querySelector('#distance');
const $distanceValue = document.querySelector('#distance-value');

// Initialise l'affichage du slider si présent
if ($distanceRange) {
	// Valeur initiale depuis l'objet Geo
	$distanceRange.value = myGeo.distance;
	if ($distanceValue) $distanceValue.textContent = `${Number(myGeo.distance).toFixed(1)} km`;

	// Quand l'utilisateur déplace le slider, on change la distance et recharge les arrêts
	$distanceRange.addEventListener('input', (e) => {
		const km = Number(e.target.value);
		myGeo.setDistance(km);
		if ($distanceValue) $distanceValue.textContent = `${km.toFixed(1)} km`;

		// Recharge autour de la dernière position connue, sinon autour du centre de la carte
		const pos = myGeo.lastPosition || (myGeo.map ? { coords: { latitude: myGeo.map.getCenter().lat, longitude: myGeo.map.getCenter().lng } } : null);
		if (pos) myGeo.loadStops(pos);
	});
}



// délenche la gestion de fermetures des boxes
// Initialise le flow d'installation (PWA) si disponible
installApp()

// délenche la gestion de fermetures des boxes
boxClose()