# Plan : Multi-Restaurant avec Sélection par QR Code ou Liste

## Résumé de la Vision
- Tous les restaurants listés sur l'application
- Scan QR code → sélection automatique du restaurant
- Sélection manuelle possible depuis la liste
- Résultat : chargement du menu du restaurant correspondant

---

## Analyse de l'Existant

### Ce qui existe déjà ✅
1. **API de listing des restaurants** : `GET /api/v1/restaurants` (paginé, avec recherche)
2. **Accès par slug** : Routes `/r/:slug` et `/r/:slug/table/:tableNumber`
3. **API menu public** : `/api/v1/menu/slug/:slug` - retourne restaurant + catégories + plats
4. **Modèle Restaurant** : complet avec name, slug, logo, description, address, settings
5. **MenuStore** : `loadMenu(slug)` charge le menu d'un restaurant spécifique

### Incohérences / Points à Modifier ⚠️

| Élément Actuel | Problème | Solution Requise |
|----------------|----------|------------------|
| Slug par défaut hardcodé (`garbadrome-patte-doie`) | Pas de multi-restaurant dynamique | Supprimer le default, forcer la sélection |
| Route `/menu` → slug par défaut | Contourne la sélection restaurant | Rediriger vers la liste ou exiger un slug |
| Pas de page d'accueil/listing | Les clients ne peuvent pas découvrir les restaurants | Créer une page RestaurantsView |
| MenuStore sans gestion de "restaurant actuel" | Pas de persistance du choix restaurant | Ajouter un store `restaurantStore` |
| QR code redirige directement vers menu | Pas de "sélection" visible | OK - comportement souhaité, mais besoin d'indiquer le restaurant sélectionné |
| Pas de scanner QR intégré | Dépend de l'appareil photo du téléphone | Optionnel - le scan externe via caméra fonctionne |

---

## TODO - Actions à Implémenter

### Phase 1 : Store & State Management

- [ ] **1.1** Créer un nouveau store `restaurantStore.ts`
  - State : `selectedRestaurant`, `restaurants[]`, `loading`, `error`
  - Actions : `fetchRestaurants()`, `selectRestaurant(slug)`, `clearSelection()`
  - Persistance localStorage pour garder le restaurant sélectionné
  - Fichier : `/menuqr-app/src/stores/restaurantStore.ts`

- [ ] **1.2** Modifier `menuStore.ts` pour supprimer le slug par défaut
  - Retirer `DEFAULT_RESTAURANT_SLUG`
  - Adapter `loadMenu()` pour exiger un slug obligatoire
  - Fichier : `/menuqr-app/src/stores/menuStore.ts`

### Phase 2 : API Service

- [ ] **2.1** Ajouter les méthodes API pour la liste des restaurants
  - `getRestaurants(params?: { page, limit, search })`
  - `getRestaurantBySlug(slug)`
  - Fichier : `/menuqr-app/src/services/api.ts`

### Phase 3 : Pages & Composants

- [ ] **3.1** Créer la page `RestaurantsView.vue` (page d'accueil)
  - Liste des restaurants avec logo, nom, description, adresse
  - Barre de recherche
  - Pagination ou infinite scroll
  - Click sur restaurant → navigation vers `/r/:slug`
  - Fichier : `/menuqr-app/src/views/RestaurantsView.vue`

- [ ] **3.2** Créer le composant `RestaurantCard.vue`
  - Affiche logo, nom, description courte, adresse
  - Animation hover/tap
  - Fichier : `/menuqr-app/src/components/restaurant/RestaurantCard.vue`

- [ ] **3.3** Créer le composant `RestaurantHeader.vue` (pour MenuView)
  - Affiche le restaurant actuellement sélectionné en haut du menu
  - Bouton "Changer de restaurant" → retour à la liste
  - Fichier : `/menuqr-app/src/components/restaurant/RestaurantHeader.vue`

### Phase 4 : Routing

- [ ] **4.1** Modifier le router pour la nouvelle structure
  - `/` → `RestaurantsView` (page d'accueil = liste restaurants)
  - `/r/:slug` → `MenuView` (menu du restaurant)
  - `/r/:slug/table/:tableNumber` → `MenuView` (avec table)
  - Supprimer ou rediriger `/menu` vers `/`
  - Fichier : `/menuqr-app/src/router/index.ts`

- [ ] **4.2** Ajouter une garde de navigation
  - Si accès à `/r/:slug` et restaurant inexistant → redirect vers `/` avec message d'erreur
  - Fichier : `/menuqr-app/src/router/index.ts`

### Phase 5 : Intégration QR Code

- [ ] **5.1** Vérifier que le flux QR code fonctionne
  - Scan QR → URL `/r/:slug` → chargement automatique du menu
  - Stocker le restaurant dans `restaurantStore`
  - Pas de changement majeur requis si le routing est correct

- [ ] **5.2** Ajouter un scanner QR intégré ✅ (Confirmé par l'utilisateur)
  - Installer la librairie `vue-qrcode-reader` ou `@aspect/vue-qrcode-reader`
  - Créer le composant `QRScanner.vue`
  - Bouton "Scanner QR" visible sur la page RestaurantsView
  - Modal/fullscreen pour le scanner
  - Extraire le slug de l'URL scannée
  - Naviguer vers `/r/:slug`
  - Fichier : `/menuqr-app/src/components/restaurant/QRScanner.vue`

### Phase 6 : UX & Navigation

- [ ] **6.1** Ajouter un bouton "Changer de restaurant" visible ✅ (Confirmé par l'utilisateur)
  - Bouton toujours visible dans le header/RestaurantHeader
  - Accessible même après scan QR
  - Permet de revenir facilement à la liste des restaurants
  - Fichier : `/menuqr-app/src/components/restaurant/RestaurantHeader.vue`

- [ ] **6.2** Popup de confirmation avant vidage du panier ✅ (Confirmé par l'utilisateur)
  - Créer un composant `ConfirmDialog.vue` (ou utiliser existant)
  - Si panier non vide et changement de restaurant :
    - Afficher popup : "Votre panier contient X articles. Changer de restaurant videra votre panier. Continuer ?"
    - Boutons : "Annuler" / "Continuer et vider"
  - Si confirmation → vider panier et naviguer
  - Si annulation → rester sur le restaurant actuel
  - Fichier : `/menuqr-app/src/components/common/ConfirmDialog.vue`

- [ ] **6.3** Mettre à jour le `AppHeader.vue`
  - Afficher le nom du restaurant sélectionné
  - Lien vers la liste des restaurants

### Phase 7 : Tests & Validation

- [ ] **7.1** Tester le flux complet
  - Accès direct à `/` → liste restaurants → sélection → menu
  - Scan QR code → menu direct du restaurant
  - Changement de restaurant avec panier non vide
  - Rafraîchissement de page (persistance du choix)

- [ ] **7.2** Tester les cas d'erreur
  - Restaurant slug inexistant
  - API indisponible
  - Mode offline

---

## Flux Utilisateur Final

```
┌─────────────────────────────────────────────────────────────┐
│                    NOUVEAU FLUX UTILISATEUR                 │
└─────────────────────────────────────────────────────────────┘

OPTION A : Via Liste
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Accueil   │───▶│ Liste Restaus   │───▶│   Menu du   │
│     (/)     │    │ (click/search)  │    │  Restaurant │
└─────────────┘    └─────────────────┘    └─────────────┘

OPTION B : Via QR Code
┌─────────────┐    ┌─────────────────────────────────────┐
│  Scan QR    │───▶│  /r/:slug  → Menu du Restaurant    │
│  (externe)  │    │  (sélection automatique)            │
└─────────────┘    └─────────────────────────────────────┘

Navigation interne :
┌─────────────┐    ┌─────────────────┐
│   Menu du   │◀──▶│ "Changer de     │───▶ Retour à /
│  Restaurant │    │  restaurant"    │
└─────────────┘    └─────────────────┘
```

---

## Fichiers à Modifier/Créer

| Action | Fichier |
|--------|---------|
| Créer | `/menuqr-app/src/stores/restaurantStore.ts` |
| Créer | `/menuqr-app/src/views/RestaurantsView.vue` |
| Créer | `/menuqr-app/src/components/restaurant/RestaurantCard.vue` |
| Créer | `/menuqr-app/src/components/restaurant/RestaurantHeader.vue` |
| Créer | `/menuqr-app/src/components/restaurant/QRScanner.vue` |
| Créer | `/menuqr-app/src/components/common/ConfirmDialog.vue` |
| Modifier | `/menuqr-app/src/stores/menuStore.ts` |
| Modifier | `/menuqr-app/src/router/index.ts` |
| Modifier | `/menuqr-app/src/services/api.ts` |
| Modifier | `/menuqr-app/src/stores/cartStore.ts` |
| Modifier | `/menuqr-app/src/components/AppHeader.vue` |
| Installer | `vue-qrcode-reader` (npm package pour le scanner QR) |

---

## Estimation de Complexité

| Phase | Complexité | Priorité |
|-------|------------|----------|
| Phase 1 (Store) | Moyenne | Haute |
| Phase 2 (API) | Faible | Haute |
| Phase 3 (Composants) | Moyenne | Haute |
| Phase 4 (Routing) | Faible | Haute |
| Phase 5 (QR) | Faible | Moyenne |
| Phase 6 (UX) | Moyenne | Moyenne |
| Phase 7 (Tests) | Faible | Haute |
