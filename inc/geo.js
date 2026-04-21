/**
 * =============================================================================
 * TABLE DES MATIÈRES
 * =============================================================================
 * 1. CONSTRUCTEUR & CONFIGURATION ........ Initialisation et état global
 * 2. GESTION DES ICÔNES .................. Création des marqueurs personnalisés
 * 3. SYSTÈME DE GÉOLOCALISATION .......... GPS, Permissions et Secours
 * 4. MOTEUR DE CARTE (LEAFLET) ........... Création et gestion des calques
 * 5. CHARGEMENT DES DONNÉES (API) ........ Récupération des arrêts (ODWB)
 * 6. RENDU ET POPUPS ..................... Affichage des marqueurs et bus
 * =============================================================================
 */

class Geo {
    /**
     * 1. CONSTRUCTEUR & CONFIGURATION
     * Prépare les variables de base dont l'application a besoin pour fonctionner.
     */
    constructor($mapBox) {
        // L'adresse de notre serveur qui contient les données des lignes de bus
        this.urlApi = 'https://cepegra-frontend.xyz/bootcamp';
        
        // Références aux éléments HTML (la div de la carte et le bouton)
        this.$mapBox = $mapBox;
        
        // État de l'application : on stocke la carte et la distance de recherche
        this.map = null;          // Contiendra l'objet Leaflet une fois créé
        this.distance = 1;        // Rayon de recherche par défaut (1km)
        this.lastPosition = null; // Stocke les dernières coordonnées pour les calculs
        
        // --- LES CALQUES (LAYER GROUPS) ---
        // On crée des "tiroirs" pour ranger nos éléments.
        // Cela permet de vider un tiroir (ex: les arrêts) sans effacer la carte elle-même.
        this.layers = {
            stops: L.layerGroup(),   // Pour les icônes d'arrêts de bus
            route: L.layerGroup(),   // Pour le tracé rouge du bus
            walking: L.layerGroup(), // Pour le tracé piéton/itinéraire vers un arrêt (solide)
            walkingDotted: L.layerGroup(), // Pour le tracé pointillé (OSRM)
        };
    this.activeMarker = null; // Pour stocker le marqueur de la position cliquée (si besoin)

    // Favoris (routes/stops) stockés en localStorage
    this.favorites = this._loadFavorites();

        // Écouteur global pour les lignes de bus (Délégation d'événement)
        // On écoute la zone de la carte : si on clique sur un lien avec la classe 'bus-link', on trace la ligne.
        // Remplace ton ancien écouteur par celui-ci :
        document.addEventListener('click', (e) => {
            // On vérifie si l'élément cliqué (ou l'un de ses parents) est un lien de bus
            const busLink = e.target.closest('.bus-link');
            
            if (busLink) {
                e.preventDefault();
                console.log("Chargement de la ligne :", busLink.dataset.shape);
                this.drawRoute(busLink.dataset.shape);
                
                // Optionnel : On peut fermer le panneau quand on clique sur une ligne
                // document.querySelector('#info-panel').classList.add('hidden');
            }
        });

        // Options pour la précision du GPS
        this.optionsMap = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
        
        // On lance la préparation des images des marqueurs
        this._initIcons();
    }

    /**
     * Trace un itinéraire vers destLat/destLon via OSRM.
     * options: { dashed: boolean, profile: 'driving'|'foot'|'cycling' }
     */
    async _routeToStop(destLat, destLon, options = {}) {
        const dashed = Boolean(options.dashed);
        let profile = options.profile || 'driving';

        // Choisit la couche selon dashed
        const layer = dashed ? this.layers.walkingDotted : this.layers.walking;
        if (!layer) return;

        // Clear the chosen layer before drawing
        layer.clearLayers();

        // Determine start position
        const start = this.lastPosition ? { lat: this.lastPosition.coords.latitude, lon: this.lastPosition.coords.longitude } : (this.map ? { lat: this.map.getCenter().lat, lon: this.map.getCenter().lng } : null);
        if (!start) return;

        const startLng = start.lon;
        const startLat = start.lat;

        // Prepare panel info
        const $panel = document.querySelector('#info-panel');
        const $routeInfo = $panel ? ($panel.querySelector('.route-info') || (() => { const n = document.createElement('div'); n.className='route-info'; n.style.marginTop='8px'; n.style.color='#333'; $panel.appendChild(n); return n; })()) : null;
        if ($routeInfo) $routeInfo.textContent = 'Calcul de l\'itinéraire...';

        // Try requested profile, fallback to driving if no route (public OSRM may not support foot)
        const tryProfile = async (p) => {
            const url = `https://router.project-osrm.org/route/v1/${p}/${startLng},${startLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();
                return data;
            } catch (err) {
                console.warn('OSRM request failed for profile', p, err);
                return null;
            }
        };

        let data = await tryProfile(profile);
        if ((!data || !data.routes || data.routes.length === 0) && profile !== 'driving') {
            // fallback
            data = await tryProfile('driving');
            profile = 'driving';
        }

        if (!data || !data.routes || data.routes.length === 0) {
            if ($routeInfo) $routeInfo.textContent = 'Aucun itinéraire trouvé.';
            return;
        }

        const route = data.routes[0];
        const geojson = route.geometry;

        // Style: dashed or solid
        const style = dashed ? { color: '#007bff', weight: 4, opacity: 0.9, dashArray: '8 8' } : { color: '#007bff', weight: 5, opacity: 0.9 };

        const routeLayer = L.geoJSON(geojson, { style });
        routeLayer.addTo(layer);

        // Markers on same layer
        L.marker([startLat, startLng], { icon: this.icons.user }).addTo(layer);
        L.marker([destLat, destLon], { icon: this.icons.end }).addTo(layer);

        // Fit bounds
        try { this.map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] }); } catch (err) { /* ignore */ }

        // Show distance/duration
        if ($routeInfo) {
            const distKm = (route.distance / 1000).toFixed(2);
            const durMin = Math.round(route.duration / 60);
            $routeInfo.textContent = `Distance: ${distKm} km — Durée estimée: ${durMin} min (profil: ${profile})`;
        }
    }

    /**
     * 2. GESTION DES ICÔNES
     * Définit l'apparence des marqueurs sur la carte (taille, point d'ancrage).
     */
    _initIcons() {
        const configCommune = {
            iconSize: [53, 53],    // Taille de l'image en pixels
            iconAnchor: [26, 53],  // Le point de l'image qui "touche" la coordonnée (le bas milieu)
            popupAnchor: [0, -50]  // Où la bulle d'info s'affiche par rapport au marqueur
        };

        this.icons = {
            stop: L.icon({ ...configCommune, iconUrl: './icons/icon-map-bus-stop.svg' }),
            start: L.icon({ ...configCommune, iconUrl: './icons/icon-map-bus-start.svg' }),
            end: L.icon({ ...configCommune, iconUrl: './icons/icon-map-bus-end.svg' }),
            user: L.icon({ ...configCommune, iconUrl: './icons/icon-map-user-location.svg' })
        };
    }

    /* ---------- FAVORITES (localStorage) ---------- */
    _loadFavorites() {
        try {
            const raw = localStorage.getItem('tec_favorites');
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            return [];
        }
    }

    _saveFavorites() {
        try {
            localStorage.setItem('tec_favorites', JSON.stringify(this.favorites || []));
        } catch (err) { console.warn('Saving favorites failed', err); }
    }

    _isFavoriteRoute(shapeId) {
        return (this.favorites || []).some(f => f.type === 'route' && String(f.shape_id) === String(shapeId));
    }

    _toggleFavoriteRoute(route) {
        // route: { shape_id, name }
        const idx = (this.favorites || []).findIndex(f => f.type === 'route' && String(f.shape_id) === String(route.shape_id));
        if (idx >= 0) {
            this.favorites.splice(idx, 1);
        } else {
            (this.favorites = this.favorites || []).push({ type: 'route', shape_id: route.shape_id, name: route.name });
        }
        this._saveFavorites();
    }

    _renderFavoritesPanel() {
        const $panel = document.getElementById('favorites-panel');
        const $list = document.getElementById('favorites-list');
        if (!$panel || !$list) return;

        // build list
        $list.innerHTML = '';
        (this.favorites || []).forEach((f, i) => {
            if (f.type === 'route') {
                const el = document.createElement('div');
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';
                el.style.alignItems = 'center';
                el.style.padding = '6px 0';
                el.innerHTML = `<div style="flex:1">${f.name || f.shape_id}</div>
                    <div style="margin-left:8px"><button class="fav-draw" data-index="${i}">Voir</button> <button class="fav-remove" data-index="${i}">✖</button></div>`;
                $list.appendChild(el);
            }
        });

        // attach handlers
        $list.querySelectorAll('.fav-draw').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = Number(e.currentTarget.dataset.index);
            const fav = this.favorites[idx];
            if (fav && fav.type === 'route') {
                // draw the route by shape id using existing drawRoute function if possible
                if (fav.shape_id) this.drawRoute(fav.shape_id);
            }
        }));

        $list.querySelectorAll('.fav-remove').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = Number(e.currentTarget.dataset.index);
            this.favorites.splice(idx, 1);
            this._saveFavorites();
            this._renderFavoritesPanel();
        }));

        // add form handler
        const $addBtn = document.getElementById('fav-add-btn');
        if ($addBtn) {
            $addBtn.onclick = () => {
                const sid = document.getElementById('fav-shape-id').value.trim();
                const name = document.getElementById('fav-shape-name').value.trim() || sid;
                if (!sid) return alert('Entrez un shape_id');
                this.favorites = this.favorites || [];
                this.favorites.push({ type: 'route', shape_id: sid, name });
                this._saveFavorites();
                document.getElementById('fav-shape-id').value = '';
                document.getElementById('fav-shape-name').value = '';
                this._renderFavoritesPanel();
            };
        }
    }

    /**
     * 3. SYSTÈME DE GÉOLOCALISATION
     * Gère la demande d'autorisation et récupère la position de l'utilisateur.
     */
    async init() {
        try {
            // On vérifie si l'utilisateur a déjà donné sa permission
            const result = await navigator.permissions.query({ name: 'geolocation' });
            
            if (result.state === 'granted' || result.state === 'prompt') {
                // Si autorisé, on demande la position précise au navigateur
                navigator.geolocation.getCurrentPosition(
                    (pos) => this.createMap(pos), // Succès
                    (err) => this.errorPosition(err), // Erreur
                    this.optionsMap
                );
            } else {
                // Si refusé, on utilise la position de secours
                this._fallbackPosition();
            }
        } catch (error) {
            this._fallbackPosition();
        }
    }

    // Position par défaut (Neuville) si le GPS est inaccessible
    _fallbackPosition() {
        const dummyPos = { coords: { latitude: 50.112673, longitude: 4.418669 } };
        this.createMap(dummyPos);
    }

    // Affiche une erreur dans la console si le GPS échoue
    errorPosition(err) {
        console.warn(`Erreur de localisation (${err.code}): ${err.message}`);
    }

    // Permet de changer le rayon de recherche (ex: via le curseur range)
    setDistance(km) {
        this.distance = km;
    }

    /**
     * 4. MOTEUR DE CARTE (LEAFLET)
     * Affiche la carte et configure les interactions de base.
     */
    createMap(position) {
        const { latitude, longitude } = position.coords;

        // Si une carte existe déjà, on la supprime pour éviter les bugs visuels
        if (this.map) this.map.remove();

        // On affiche la zone de la carte et on initialise Leaflet centrée sur nous
        this.$mapBox.classList.remove('hidde');
        this.map = L.map(this.$mapBox).setView([latitude, longitude], 17);

        // On ajoute le "fond de carte" (les images des rues)
        L.tileLayer("https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f5a6d9a8d3484637b41037978e6e1e7b", {
            attribution: '© OpenStreetMap - TEC'
        }).addTo(this.map);

        // On active nos "tiroirs" (calques) sur la carte
        this.layers.stops.addTo(this.map);
        this.layers.route.addTo(this.map);
        this.layers.walking.addTo(this.map);
        this.layers.walkingDotted.addTo(this.map);

        // Marqueur fixe pour notre position initiale
        L.marker([latitude, longitude], { icon: this.icons.user }).addTo(this.map);

        // On charge les arrêts autour de nous
        this.loadStops(position);

        // --- CLIC SUR LA CARTE : ajout d'un "ping", affichage des coordonnées et recherche des arrêts ---
        // Quand l'utilisateur clique sur la carte, on place/replace un marqueur, on ouvre une popup
        // avec les coordonnées et on appelle loadStops avec la position cliquée.
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;

            // Supprime l'ancien ping si nécessaire
            if (this._clickMarker) {
                try { this.map.removeLayer(this._clickMarker); } catch (err) { /* ignore */ }
            }

            // Création d'un marqueur "ping" (utilise l'icône start pour le rendre visible)
            this._clickMarker = L.marker([lat, lng], { icon: this.icons.start }).addTo(this.map);

            // Affiche les coordonnées dans une popup lisible
            const popupHtml = `<strong>Coordonnées</strong><br>Lat : ${lat.toFixed(6)}<br>Lng : ${lng.toFixed(6)}`;
            this._clickMarker.bindPopup(popupHtml).openPopup();

            // Appel de loadStops en réutilisant le format attendu (objet position avec coords)
            this.loadStops({ coords: { latitude: lat, longitude: lng } }, true);
        });

        // Favorites panel toggle
        const favToggle = document.getElementById('favorites-toggle');
        const favPanel = document.getElementById('favorites-panel');
        if (favToggle && favPanel) {
            favToggle.addEventListener('click', () => {
                favPanel.classList.toggle('hidden');
                // render content
                this._renderFavoritesPanel();
            });

            // close button inside panel
            const closeBtn = favPanel.querySelector('.cross.close');
            if (closeBtn) closeBtn.addEventListener('click', () => favPanel.classList.add('hidden'));
        }
    }

    /**
     * 5. CHARGEMENT DES DONNÉES (API)
     * Va chercher les arrêts de bus TEC réels via l'Open Data Wallonie-Bruxelles.
     */
    async loadStops(position, showClickMarker = false) {
        this.lastPosition = position; // Sauvegarde pour les calculs d'itinéraires piétons
        
        // Nettoyage avant de charger de nouveaux points
        this.layers.stops.clearLayers();
        
        const { latitude, longitude } = position.coords;

        try {
            // URL complexe qui demande : "donne moi les arrêts dans un rayon de X km autour de ce point"
            const url = `https://www.odwb.be/api/explore/v2.1/catalog/datasets/le-tec-arrets-bus/records?limit=100&where=within_distance(coordinates, geom'POINT(${longitude} ${latitude})', ${this.distance}km)&order_by=distance(coordinates, geom'POINT(${longitude} ${latitude})')`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // Pour chaque arrêt trouvé par l'API, on crée son marqueur
                data.results.forEach(stop => this._renderStopMarker(stop));
            } else {
                // Si aucun arrêt, on affiche notre message d'alerte HTML
                document.querySelector('.box-alert').classList.remove('hidden');
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des arrêts :", error);
        }
    }

    /**
     * 6. RENDU ET POPUPS
     * Crée physiquement les icônes d'arrêts et gère le contenu de la bulle d'info.
     */
    _renderStopMarker(stop) {
    const stopPos = L.latLng(stop.coordinates.lat, stop.coordinates.lon);
    const userPos = L.latLng(this.lastPosition.coords.latitude, this.lastPosition.coords.longitude);
    const distance = userPos.distanceTo(stopPos);
    const distText = distance > 1000 ? (distance / 1000).toFixed(1) + " km" : Math.round(distance) + " m";

    const marker = L.marker([stop.coordinates.lat, stop.coordinates.lon], { icon: this.icons.stop })
        .addTo(this.layers.stops);

    marker.on('click', async () => {
        // Si un autre marqueur était actif, on lui retire la classe
        if (this.activeMarker && this.activeMarker._icon) {
            this.activeMarker._icon.classList.remove('marker-active');
        }

        // On ajoute la classe au marqueur actuel
        marker._icon.classList.add('marker-active');
        
        // On mémorise que c'est lui le nouveau "chef"
        this.activeMarker = marker;
        // 1. Récupération des bus qui passent par l'arrêt (via notre API)
        const response = await fetch(`${this.urlApi}/bus/${stop.stop_name}/${stop.coordinates.lon}`);
        const data = await response.json();
        
        let busHtml = "";
        if (data.code === "ok") {
            data.content.forEach(bus => {
                if (bus.route_id) {
                    // SVGs for filled and outline star (small, inline)
                    const starFilled = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" class="star-filled"><path fill="currentColor" d="M12 .587l3.668 7.431L24 9.748l-6 5.847 1.417 8.266L12 18.896 4.583 23.861 6 15.595 0 9.748l8.332-1.73z"/></svg>';
                    const starOutline = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" class="star-outline"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
                    const isFav = this._isFavoriteRoute(bus.shape_id);

                    // store short and long names in data attributes to avoid HTML-escaping issues
                    const shortName = (bus.route_short_name || '').replace(/"/g, '&quot;');
                    const longName = (bus.route_long_name || '').replace(/"/g, '&quot;');

                    // Wrap in a flex container so the favorite button sits next to the line name
                    const svgIcon = isFav ? starFilled : starOutline;
                    busHtml += `<div class="line-item"><a href="#" class="bus-link" data-shape="${bus.shape_id}">${bus.route_short_name} - ${bus.route_long_name}</a><button class="fav-route-btn" data-shape="${bus.shape_id}" data-short="${shortName}" data-long="${longName}">${svgIcon}</button></div>`;
                }
            });
        }

        // 2. Préparation du contenu du panneau
        const $panel = document.querySelector('#info-panel');
            $panel.innerHTML = `
                <span class="close-panel">&times;</span>
                <h4>${stop.stop_name}</h4>
                <hr>
                <div class="bus-list">${busHtml}</div>
                <button class="route-dashed-btn" data-lat="${stop.coordinates.lat}" data-lng="${stop.coordinates.lon}">Itinéraire a pied</button>
            `;

        // 3. Affichage (en retirant la classe hidden)
        $panel.classList.remove('hidden');

        // 4. Gestion de la fermeture
        $panel.querySelector('.close-panel').addEventListener('click', () => {
            $panel.classList.add('hidden');
            if (this.layers.walking) this.layers.walking.clearLayers(); // On efface le tracé bleu aussi
            if (this.layers.walkingDotted) this.layers.walkingDotted.clearLayers(); // On efface le tracé pointillé aussi
        });

        // 5. Bouton itinéraire pointillé -> appelle OSRM et trace en pointillé
        const $routeDashedBtn = $panel.querySelector('.route-dashed-btn');
        if ($routeDashedBtn) {
            $routeDashedBtn.addEventListener('click', async (ev) => {
                const btn = ev.currentTarget;
                const lat = Number(btn.dataset.lat);
                const lng = Number(btn.dataset.lng);

                // disable and show spinner while calculating route
                btn.disabled = true;
                btn.classList.add('loading');
                const origHtml = btn.innerHTML;
                btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Calcul...';

                try {
                    await this._routeToStop(lat, lng, { dashed: true, profile: 'foot' });
                } finally {
                    btn.disabled = false;
                    btn.classList.remove('loading');
                    btn.innerHTML = origHtml;
                }
            });
        }

        // favorite buttons next to each bus link
        $panel.querySelectorAll('.fav-route-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const shape = e.currentTarget.dataset.shape;
                const shortN = e.currentTarget.dataset.short || '';
                const longN = e.currentTarget.dataset.long || '';
                const name = (shortN && longN) ? `${shortN} - ${longN}` : (shortN || longN || shape);
                this._toggleFavoriteRoute({ shape_id: shape, name });

                // swap SVG inside the button according to new favorite state
                const starFilled = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" class="star-filled"><path fill="currentColor" d="M12 .587l3.668 7.431L24 9.748l-6 5.847 1.417 8.266L12 18.896 4.583 23.861 6 15.595 0 9.748l8.332-1.73z"/></svg>';
                const starOutline = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" class="star-outline"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';

                e.currentTarget.innerHTML = this._isFavoriteRoute(shape) ? starFilled : starOutline;
                // update favorites panel if open
                this._renderFavoritesPanel();
            });
        });
    });
}


    
    // Trace le parcours complet d'une ligne de bus (depuis notre API)
    async drawRoute(shapeId) {
        this.layers.route.clearLayers(); // On efface le trajet précédent

        try {
            //requête à notre API pour récupérer les points de la ligne de bus
            const response = await fetch(`${this.urlApi}/shapes/${shapeId}`);
            const data = await response.json();

            if (data.content && data.content.length > 0) {
                // Transformation des points API en coordonnées Leaflet
                const points = data.content.map(p => [p.shape_pt_lat, p.shape_pt_lon]);
                
                // Dessin de la ligne rouge
                L.polyline(points, { color: 'red', weight: 8, opacity: 0.7 }).addTo(this.layers.route);
                
                // Icônes de départ et d'arrivée du bus
                L.marker(points[0], { icon: this.icons.start }).bindPopup('Départ du bus').addTo(this.layers.route);
                L.marker(points[points.length - 1], { icon: this.icons.end }).bindPopup('Terminus').addTo(this.layers.route);

                // On ajuste la vue pour voir toute la ligne de bus
                this.map.flyToBounds(points, { padding: [50, 50] });
            }
        } catch (error) {
            console.error("Erreur lors du tracé du trajet :", error);
        }
    }

   
}

export { Geo };