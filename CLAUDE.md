# Plan de stockage — Échalotes & Oignons (SAS La Légumière)

Application web de suivi du stockage d'échalotes et d'oignons en entrepôt/frigo, pour l'entreprise **la légumière**. Ce fichier résume ce qui a été construit, pour que n'importe quelle session Claude (ou un autre développeur) reprenne le contexte rapidement sans relire tout le code.

## Vue d'ensemble

- **Un seul fichier** `index.html` — HTML + CSS + JavaScript vanilla (pas de framework, pas de build). Tout est dans une balise `<script>` en IIFE.
- **Multi-utilisateur en temps réel** via Firebase : Authentication (email/mot de passe) + Firestore (base de données). Sans Firebase, pas de partage de données entre utilisateurs — c'est une contrainte assumée, pas une option à retirer.
- **Toutes les données** (cellules, lignes, palox, historique, listes produits/calibres) sont stockées dans **un seul document Firestore** (`planStockage/main`), sous forme d'un unique JSON (`state`), synchronisé en temps réel via `onSnapshot`.
- **Hébergement** : GitHub Pages.
  - Racine du dépôt (`index.html`) = la vraie application, connectée à Firebase (config déjà remplie dans le fichier, projet `plan-de-stockage-alliums`).
  - Dossier `/docs` (`docs/index.html`) = une **démo autonome sans Firebase** (données seed + bandeau de changement de rôle), utilisée pour montrer l'avancement sans toucher aux vraies données. Elle n'est pas maintenue en continu — à régénérer manuellement depuis `index.html` si besoin (enlever le SDK Firebase, remplacer la persistance par du state local).

## Rôles et droits (3 niveaux)

Stockés dans Firestore, collection `users`, un document par compte (`id` = UID Firebase Auth), champs `email` + `role`.

- **`admin`** : tout + onglets **Cellules** (config des cellules/lignes) et **Comptes** (voir tous les comptes, changer leur rôle) + gestion des listes **Produits**/**Calibres** + suppression de lignes d'historique.
- **`editor`** (« Gestion ») : entrée/sortie/déplacement/modification de stock. Pas d'accès à Cellules ni Comptes.
- **`viewer`** (« Consultation ») : lecture seule. Rôle par défaut si aucun document `users/{uid}` n'existe.

Logique dans le code : `canManageStock()` = editor||admin, `isAdmin()` = admin seul. Règles Firestore équivalentes dans `firestore.rules`.

Un compte ne peut pas changer son propre rôle (sécurité anti-blocage). Création de compte = toujours via la console Firebase (pas de self-signup dans l'app) ; l'admin peut ensuite lui assigner un rôle depuis l'onglet Comptes.

## Modèle de données

```
state = {
  cellules: [ { id, nom, lignes: [ { id, nom, capacite } ] } ],
  lots: [ /* CHAQUE ENTRÉE = UN PALOX PHYSIQUE, pas un lot agrégé */
    {
      id, celluleId, ligneId, batchId,   // batchId regroupe les palox entrés ensemble (même produit/lot/calibre/traitement/emplacement)
      produit, lot, lot2,                // lot2 optionnel = palox mixte
      parcelle, calibre, traitement,     // traitement = booléen "antigerme"
      poidsSorti,                        // booléen, classement produit pour la facturation (indépendant du poids réel)
      poids, poidsLot2,                  // poids par palox, obligatoire à l'entrée
      dateEntree, commentaire
    }
  ],
  transactions: [ { id, type: 'entree'|'sortie'|'deplacement'|'modification', date, produit, lot, quantite, poids, label/fromLabel+toLabel, commentaire, responsable } ],
  produits: [ "Echalote", "Echalion", ... ],   // liste fermée, gérée par l'admin (onglet Comptes)
  calibres: [ "20/40", "40/60", ... ]          // idem, liste fermée gérée par l'admin
}
```

Points importants :
- **Un palox = une ligne dans `state.lots`.** Plusieurs palox entrés ensemble partagent un `batchId` pour l'affichage groupé ("carte de lot").
- **`groupByBatch()`** reconstruit les cartes de lot à partir de `state.lots`, clé = `batchId+celluleId+ligneId`.
- **Fusion automatique des batchId** dans `migrate()` : si plusieurs entrées partagent exactement produit+lot+lot2+calibre+traitement+emplacement, elles sont fusionnées sous un seul `batchId` (évite la fragmentation causée par des modifications successives).
- **Remplissage d'une ligne** = capacité en nombre de palox (`ligne.capacite`), pas de notion de hauteur/position précise (modèle simplifié volontairement).
- **Couleur par produit** : palette fixe par mots-clés (`FIXED_PRODUCT_COLORS`, normalisation accents/casse) — échalote=gris, échalion=bleu, échalote de semis=mauve, oignon de roscoff=rose, oignon rouge=rouge, oignon jaune=jaune ; hash de fallback pour tout produit non reconnu.

## Onglets de l'application

- **Stockage** : plan par cellule → lignes, barre de remplissage segmentée par produit, clic sur une ligne ou un produit → détail du lot (cartes avec palox individuels, cases à cocher + "Tout sélectionner", actions Sortir/Déplacer/Modifier/Supprimer la sélection). Bouton "+ Entrée" global et un bouton "+ Entrée" par ligne (pré-remplit cellule/ligne).
- **Recherche** ("Consultation des stocks") : filtres cellule/produit/calibre/lot + recherche libre multi-mots multi-colonnes (chaque mot peut matcher une colonne différente). Résultats groupés par produit avec sous-total par groupe + total général. Export Excel (CSV point-virgule, BOM UTF-8).
- **Stock global** : vue d'ensemble par produit+calibre, bascule "toutes cellules" / "par cellule", avec ligne de totaux.
- **Historique** : toutes les transactions (entrée/sortie/déplacement/modification), colonne **Responsable** (email du compte connecté, stampé automatiquement par `addTx()`), suppression de ligne réservée à l'admin.
- **Cellules** (admin uniquement) : configuration des cellules/lignes/capacités, sauvegarde manuelle (export/import JSON de secours).
- **Comptes** (admin uniquement) : liste des comptes + changement de rôle, gestion de la liste **Produits**, gestion de la liste **Calibres**.

## Règles de saisie importantes

- **Produit** et **Calibre** : listes déroulantes fermées (pas de texte libre), gérées par l'admin. Une valeur legacy hors-liste reste affichée (marquée "hors liste") pour ne pas perdre de données historiques.
- **Poids par palox** : obligatoire à l'entrée (les deux poids si palox mixte avec lot2). Optionnel en modification (pour ne pas bloquer la correction d'anciennes entrées sans poids connu).
- **Traitement** : case à cocher "Traitement antigerme" (oui/non), pas de texte libre.

## Fichiers du dépôt

- `index.html` — l'application (production, connectée à Firebase).
- `docs/index.html` — démo statique pour GitHub Pages / partage rapide (pas synchronisée automatiquement avec `index.html`).
- `firestore.rules` — règles de sécurité Firestore (rôles, lecture/écriture).
- `SETUP-FIREBASE.md` — guide pas-à-pas de configuration Firebase (création projet, règles, comptes, domaines autorisés).
- `README.md` — minimal, ne pas s'y fier pour le contexte (voir ce fichier à la place).

## Déploiement actuel

- Branche de dev : `claude/stockage-echalotes-oignons-6m4x91`.
- GitHub Pages activé sur cette branche, dossier racine → `https://fabianleg29.github.io/Plan_stockage_allium/` (la vraie app).
- Projet Firebase : `plan-de-stockage-alliums` (Spark/gratuit), Auth email+mot de passe + Firestore en mode production.
- Le dépôt GitHub est **public** (nécessaire pour Pages gratuit) ; ce n'est pas un risque car la config Firebase n'est pas un secret, la sécurité repose sur les règles Firestore + Auth.

## Style / thème

Palette inspirée du logo **la légumière** ("Cap sur le bon goût !") : accent violet/magenta (`--copper: #963E88`), vague dégradée décorative (`--wave-1`/`--wave-2`) sous l'en-tête et la carte de connexion, icône oignon+échalote (au lieu d'une pomme) sur l'écran de connexion et l'en-tête.

## Pour continuer le développement

Ouvrir ce dépôt avec Claude Code (ou coller ce fichier en contexte) suffit à comprendre l'architecture sans relire les ~1500 lignes de `index.html`. Toujours valider la syntaxe JS après édition (`node --check` sur le contenu du `<script>`) avant de commit/push, et pousser sur la branche `claude/stockage-echalotes-oignons-6m4x91`.
