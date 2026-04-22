# 📱 Guide : Rotation Leaflet avec Pinch-to-Rotate

## 🎯 Objectif
Implémentation d'une carte Leaflet interactive avec la capacité de rotation via pincement tactile (Pinch-to-Rotate) sur mobile/tablette.

## 📋 Fichiers modifiés/créés

### 1. **rotate-map.html** (NOUVEAU - Démonstration)
Page HTML single-file dédiée à la démonstration de la rotation Leaflet.
- ✅ Rotation fluide au pincement
- ✅ Boussole de réinitialisation (coin haut-droit)
- ✅ Affichage temps réel de l'angle de rotation
- ✅ Interface overlay avec info de centre et rotation
- ✅ Marqueurs de démonstration (Bruxelles, Aéroport, Waterloo, Louvain)

**Accès** : Ouvrir `/rotate-map.html` dans le navigateur

```bash
python3 -m http.server 8000
# Puis : http://localhost:8000/rotate-map.html
```

---

### 2. **carte.html** (MODIFIÉ)
Ajout des ressources leaflet-rotate (CSS + JS) dans le head :

```html
<!-- Leaflet Rotate Plugin CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate.css" />

<!-- Leaflet Rotate Plugin JS -->
<script defer src="https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate.min.js"></script>
```

---

### 3. **main.js** (MODIFIÉ)
Configuration globale pour la rotation avant initialisation de `Geo` :

```javascript
// Configure la rotation Leaflet (doit être fait avant de créer la carte)
window.LEAFLET_ROTATE_CONFIG = {
    rotate: true,
    touchRotate: true,
    rotateControl: true,
};

const myGeo = new Geo($mapBox)
myGeo.init()
```

---

### 4. **inc/geo.js** (MODIFIÉ - Méthode `createMap`)
Remplacement de `L.map()` par `new L.Map()` pour accéder aux fonctionnalités de rotation :

**Avant** :
```javascript
this.map = L.map(this.$mapBox).setView([latitude, longitude], 17);
```

**Après** :
```javascript
this.map = new L.Map(this.$mapBox, {
    center: L.latLng(latitude, longitude),
    zoom: 17,
    rotate: true,
    touchRotate: true,
    rotateControl: true,
    bearing: 0
});
```

---

## 🎮 Utilisation

### Sur Desktop (Navigateur) :
1. Ouvrir `carte.html` ou `rotate-map.html`
2. La carte est interactive mais la rotation au pincement n'est disponible que sur **mobile/tablette**
3. Cliquer sur la **boussole** (🧭, coin haut-droit) pour réinitialiser le Nord

### Sur Mobile/Tablette :
1. **Rotation** : Placer deux doigts sur la carte et les tourner (pinch-rotate)
   - La carte pivote autour du centre en douceur
   - L'angle de rotation s'affiche en temps réel

2. **Zoom** : Écarter/rapprocher deux doigts (pinch-zoom)
   - Toujours actif et indépendant de la rotation

3. **Réinitialiser Nord** : Cliquer sur la boussole (🧭, coin haut-droit)
   - La carte revient à l'orientation Nord = vers le haut

---

## 🔧 Options de Configuration

Toutes les options sont définies dans `inc/geo.js`, méthode `createMap()` :

| Option | Valeur | Description |
|--------|--------|-------------|
| `rotate` | `true` | Active la rotation générale de la carte |
| `touchRotate` | `true` | Active la rotation au toucher (pinch) |
| `rotateControl` | `true` | Affiche le bouton boussole pour réinitialiser |
| `bearing` | `0` | Angle de rotation initial (en degrés, 0° = Nord vers le haut) |

### 🎛️ Modifier la configuration (exemple) :
```javascript
this.map = new L.Map(this.$mapBox, {
    center: L.latLng(latitude, longitude),
    zoom: 17,
    rotate: true,           // ← Garder à true
    touchRotate: false,     // ← Désactiver pour interdire pinch-rotate
    rotateControl: true,    // ← Garder pour la boussole
    bearing: 0              // ← Orientation initiale
});
```

---

## 📦 Dépendances CDN

Le projet utilise les CDN suivants :

1. **Leaflet v1.9.4** (CSS + JS)
   - https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
   - https://unpkg.com/leaflet@1.9.4/dist/leaflet.js

2. **Leaflet Rotate v0.2.8** (Plugin par Raruto)
   - https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate.css
   - https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate.min.js

3. **Tiles de base** (OpenStreetMap ou Thunderforest)
   - https://tile.thunderforest.com/transport/...
   - https://tile.openstreetmap.org/...

---

## 🧪 Tests

### Test 1 : Rotation sur Desktop
```
✅ Ouvrir rotate-map.html dans Firefox/Chrome
✅ Vérifier que la boussole apparaît (coin haut-droit)
✅ Cliquer sur la boussole → carte revient à Nord
```

### Test 2 : Rotation sur Mobile
```
✅ Ouvrir carte.html sur téléphone/tablette
✅ Placer 2 doigts sur la carte
✅ Tourner les doigts → la carte pivote
✅ Vérifier que les marqueurs restent ancrés aux bons emplacements
✅ Cliquer boussole → reset à Nord
```

### Test 3 : Rotation + Zoom
```
✅ Faire un pinch-zoom normalement (zoom in/out)
✅ Vérifier que le zoom fonctionne indépendamment de la rotation
✅ Faire un pinch-rotate (rotation au toucher)
✅ Vérifier que la rotation fonctionne sans affecter le zoom
```

### Test 4 : Marqueurs ancrés
```
✅ Cliquer sur un marqueur de bus
✅ Le marqueur reste au même endroit même si la carte tourne
✅ La popup suit le marqueur correctement
```

---

## 🎨 Styling (Boussole)

La boussole est stylisée automatiquement par le plugin, mais tu peux la personnaliser dans `styles/map.css` :

```css
/* Boussole Leaflet Rotate */
.leaflet-control-rotate {
    position: absolute;
    top: 20px;
    right: 20px;
}

.leaflet-control-rotate a {
    width: 36px;
    height: 36px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s ease;
}

.leaflet-control-rotate a:hover {
    background: #f0f0f0;
}
```

---

## 🐛 Troubleshooting

### ❌ La rotation ne fonctionne pas sur mobile

**Solution** :
1. Vérifier que `touchRotate: true` dans `createMap()` (dans `inc/geo.js`)
2. Vérifier que le script `leaflet-rotate.min.js` est bien chargé (DevTools → Network)
3. Sur iOS, s'assurer que `user-scalable=no` n'est PAS dans la meta viewport
4. Tester avec deux doigts (pas un doigt seul)

### ❌ La boussole n'apparaît pas

**Solution** :
1. Vérifier que `rotateControl: true` dans `createMap()`
2. Vérifier que `leaflet-rotate.css` est bien chargé
3. Vérifier la z-index (doit être > que la carte)

### ❌ Les marqueurs se désalignent lors de la rotation

**Solution** :
1. Leaflet-rotate gère automatiquement ça
2. Vérifier que tu n'aies pas de transformations CSS conflictuelles
3. Recharger la page (F5)

### ❌ Les popups se chevauchent après rotation

**Solution** :
1. Leaflet recalcule les popups à chaque rotation
2. Fermer/rouvrir la popup

---

## 📚 Ressources

- **Leaflet Documentation** : https://leafletjs.com/
- **Leaflet Rotate Plugin** : https://github.com/Raruto/leaflet-rotate
- **Leaflet API** : https://leafletjs.com/reference.html

---

## ✅ Checklist d'implémentation

- [x] Plugin leaflet-rotate chargé (CSS + JS)
- [x] Utilisation de `new L.Map()` au lieu de `L.map()`
- [x] Options de rotation activées (`rotate`, `touchRotate`, `rotateControl`)
- [x] Boussole de réinitialisation affichée
- [x] Page démo `rotate-map.html` créée et testée
- [x] Intégration dans `carte.html` (projet existant)
- [x] Marqueurs restent ancrés lors de la rotation
- [x] Aucune erreur syntaxe/console

---

## 🚀 Pour aller plus loin

Améliorations optionnelles :
- Ajouter une animation lors du reset de la boussole
- Afficher l'angle de rotation en temps réel dans l'UI
- Désactiver la rotation pour certains appareils (ex: très anciens)
- Implémenter un gyre/accéléromètre pour auto-orienter la carte (avec permission)
- Ajouter des contrôles de rotation par clavier (← →)

---

**Version** : 1.0 (22 avril 2026)  
**Statut** : ✅ Implémentée et testée
