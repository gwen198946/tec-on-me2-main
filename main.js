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



// délenche la gestion de fermetures des boxes
// Initialise le flow d'installation (PWA) si disponible
installApp()

// délenche la gestion de fermetures des boxes
boxClose()