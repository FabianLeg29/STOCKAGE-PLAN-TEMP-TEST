# Plan de stockage + Relevés de température (SAS La Légumière) — dépôt de TEST

Ce dépôt (`STOCKAGE-PLAN-TEMP-TEST`) est une **copie de test** de l'application « Plan de stockage ». Le dépôt d'origine (`Plan_stockage_allium`) ne doit **jamais** être modifié depuis ici. Ce fichier résume ce qui a été construit, pour que n'importe quelle session Claude (ou un autre développeur) reprenne le contexte rapidement sans relire tout le code.

## Règles absolues de ce dépôt

1. Travailler uniquement dans ce dépôt, branche `main`. Ne jamais toucher au dépôt d'origine.
2. Une seule configuration Firebase dans tout le dépôt : celle du projet de **test** `stockage-plan-temp-test`.
3. Le nouveau code ne modifie aucune donnée existante :
   - `planStockage/main` garde exactement sa structure. Les champs `lots` et `transactions` ne sont jamais écrits par les nouveaux modules, sauf deux actions explicites d'un admin du plan dans Administration : l'import d'une sauvegarde, qui remplace tout comme l'ancien onglet Cellules, et l'archivage de l'historique du plan, désactivé par défaut.
   - `users` : seul le champ `roleReleves` est ajouté. Le champ `role` fonctionne comme avant.
4. **Jamais de sauvegarde JSON de données réelles dans le dépôt**, qui est public car GitHub Pages est gratuit. L'import se fait depuis Administration.
5. Pas d'outil de construction, pas de dépendance externe obligatoire. Le SDK Firebase est en version compat 10.13.2, comme avant.

## Vue d'ensemble

HTML + CSS + JavaScript vanilla, un fichier par page, script en IIFE. Multi-utilisateur en temps réel via Firebase : Authentication (email et mot de passe) et Firestore. La session est partagée entre les pages, car elles sont sur la même origine.

| Fichier | Rôle |
|---|---|
| `index.html` | Connexion, puis **accueil** « Que voulez-vous faire ? » avec 3 tuiles : Plan de stockage, Relevés des températures (grisée si `roleReleves` = none), Administration (visible si `role` = admin ou `roleReleves` = admin). Badge « Archivage à faire » sur la tuile Administration. Bouton Déconnexion. |
| `plan.html` | L'application historique (ancien `index.html`), code **inchangé** sauf : boutons d'onglet Cellules et Comptes retirés, barre de module ajoutée, configuration Firebase de test, et blocage du rôle « Aucun accès » (message « Accès non autorisé » au lieu du plan). Les fonctions de ces onglets restent dans le code, inutilisées : c'est voulu, pour garder un code identique à l'original. |
| `releves.html` | Module relevés de température (onglets Frigos, Produits, Historique). |
| `admin.html` | Administration, 4 rubriques (voir plus bas). |
| `xlsx-releves.js` | Générateur Excel sans dépendance (`window.XlsxReleves.construire(releves, chambres, options)`). Onglets Tableau (STOC E12.1), Graphiques (un par chambre, avec les cibles), Données graphiques, Détail. Utilisé par `releves.html` et `admin.html`. |
| `firestore.rules` | Règles de sécurité de **référence** : l'utilisateur les publie lui-même dans la console. |
| `prototype-plan-stockage-releves.html` | Maquette validée (démo avec Firebase simulé). **Référence seulement**, aucun lien depuis l'application. |
| `docs/index.html` | Ancienne démo autonome du plan seul, sans Firebase, non maintenue. |
| `SETUP-FIREBASE.md` | Guide de configuration Firebase. |
| `BASCULE.md` | Procédure de bascule vers la production (Plan_stockage_allium) : choix retenu, points d'attention sur les comptes, étapes, consigne pour la session Claude Code de production, retour arrière, feuille de bascule. |

**Cache local Firestore** (accueil, relevés, administration ; pas `plan.html`) : `enablePersistence({ synchronizeTabs: true })`. Les données déjà vues s'affichent tout de suite au changement de page, puis le serveur les met à jour. La fiche `users` est lue d'abord dans le cache, puis vérifiée auprès du serveur (`lireFiche`) : si le rôle a changé, la page se recharge. La déconnexion (accueil) vide le cache du poste. Dans l'Administration, le document du plan n'est chargé qu'à l'ouverture des rubriques Plan de stockage et Archives.

**Navigation** : une barre de module identique sur plan, relevés et administration. À gauche, le nom du module avec son repère de couleur (plan #963E88, relevés #62B4BB, administration #D2C9B4). À droite, le bouton blanc « Accueil » (lien vers `index.html`). On ne passe d'un module à l'autre que par l'accueil.

## Rôles

Collection `users`, un document par compte (`id` = UID Firebase Auth), champs `email`, `role`, `roleReleves`.

- `role` (plan) : `none` (« Aucun accès » : tuile Plan grisée, lecture du plan refusée par les règles), `viewer` (« Consultation », par défaut si absent), `editor` (« Gestion ») ou `admin`. `canManageStock()` = editor ou admin, `isAdmin()` = admin seul.
- `roleReleves` (relevés) : `none` (par défaut si absent), `viewer` (historique seul, lecture seule), `editor` (saisie) ou `admin` (saisie, plus les rubriques relevés et archives de l'Administration).
- **Compte sans fiche `users`** (créé dans Authentication mais pas déclaré) : refusé. Les règles lui interdisent la lecture du plan (`estConnu()`). L'accueil, les relevés et l'administration affichent « Compte non autorisé, contactez un administrateur » puis le déconnectent.
- Seul un **admin du plan** attribue les rôles (rubrique Comptes et accès). Un compte ne peut jamais modifier le sien. Création de compte : toujours dans la console Firebase.
- Un admin du plan a aussi accès aux rubriques relevés et archives de l'Administration, même si son `roleReleves` vaut none.

## Données Firestore

```
planStockage/main   { data: "<JSON du state>", updatedAt }   ← inchangé
  state = { cellules:[{id,nom,nonAchetee,lignes:[{id,nom,capacite}]}], lots:[palox…], transactions:[…], produits:[…], calibres:[…] }
users/{uid}         { email, nom (facultatif), role, roleReleves }
releves/{id}        { type:'frigo'|'produit', lieu, etat:'service'|'vide'|'arret' ('' pour produit), produit, lot,
                      temp, temps:[…], hr, min, max, hrMin, hrMax, tempConforme, hrConforme (frigo), conforme,
                      statut:'conforme'|'normal'|'ecart', motif, contreMesureDe (id de l'écart d'origine ou ''),
                      action, commentaire, operateur, at (ISO), mois ('AAAA-MM'),
                      uid (auteur), creeLe (Timestamp serveur), modifications:[{le, par, raison, avant:{…}}] }
temperatures/config { frigos:[{nom,famille:'legumes'|'alliums',hygro:bool,min,max,hrMin,hrMax}], produits:[{nom,min,max}],
                      motifs:[texte…] }   ← listes propres aux relevés
archives/{id}       { type:'releves'|'mouvements', mois:['AAAA-MM'], du, au, nb, creeLe (ISO), par (email),
                      expireLe (Timestamp ou null = illimitée), donnees (JSON en texte) }
parametres/conservation { relArchiveApresMois (13), relConservationAns (5), planArchiveApresMois (0 = jamais), planConservationAns (0) }
```

Points importants :
- **Plan** : le state est stocké en texte JSON dans le champ `data`, et pas `state`. Un palox est une entrée de `lots`. `migrate()` normalise le state à chaque lecture (voir `plan.html`).
- **Statut d'un relevé** :
  - `conforme` : la mesure est dans la cible.
  - `normal` (« Hors cible – normal ») : hors cible, mais l'opérateur a choisi un **motif** dans la liste gérée par l'admin (dégivrage, chargement récent…). Ni action corrective ni contre-mesure : le prochain relevé se fait à la tournée suivante. Un motif commençant par « Autre » oblige à remplir les remarques.
  - `ecart` : hors cible sans motif. **Action corrective obligatoire**. La mesure initiale est enregistrée, puis l'écran reste sur la même chambre (ou la même cellule, le même produit et le même lot) pour saisir **aussitôt la contre-mesure**, sans délai. Un bouton « Faire la contre-mesure plus tard » permet de la reporter : la chambre affiche alors « Contre-mesure à faire ».
  - Le champ `conforme` vaut `false` uniquement pour un écart. Les anciens relevés sans `statut` sont lus à partir de `conforme`.
  - Une contre-mesure est un nouveau relevé dont `contreMesureDe` contient l'id de l'écart (le relevé d'origine n'est jamais modifié). Elle reste « à faire » tant qu'aucun relevé n'a suivi l'écart le même jour : même chambre pour un frigo ; même cellule, même produit et même lot pour un contrôle à cœur.
- **Modification / suppression d'un relevé** (Historique, liste détaillée) :
  - Qui : l'**auteur** (rôle Gestion ou Admin relevés) pendant **24 h** après la création (`creeLe`), ou un **admin relevés / admin du plan** à tout moment. Un compte Consultation ne peut rien changer. Les relevés anciens sans `uid` ni `creeLe` ne sont modifiables que par un admin.
  - Modification : raison obligatoire, statut recalculé (conforme / normal / écart, avec motif ou action corrective). Les valeurs d'avant sont ajoutées à `modifications` (qui, quand, pourquoi). La date, la chambre, le type, l'auteur et `creeLe` ne changent jamais (contrôlé par les règles).
  - Suppression : définitive, après confirmation.
  - L'export Excel (onglet Détail) a une colonne « Modifications ».
- **Relevés du mois** : requête par plage sur `at` (index simple, sans index composite à créer).
- **temperatures/config absent** : il est initialisé avec les 15 chambres de la fiche STOC E12.1 (LP1, LP2, LP3, LBP, Zone prépa, Cellule 1 à 8, Cellule ail, Cellule carotte), avec une liste de produits vide.
- **Hygrométrie par chambre** (`hygro`) : case « Hygro » dans Administration. Par défaut, pas d'hygrométrie pour LP2, LP3, LBP, Zone prépa, Cellule ail et Cellule 8 (déduit du nom si le champ manque). Sans hygrométrie : pas de zone de saisie dans les relevés, ni de colonne Hygro dans le tableau STOC de l'Excel.
- **Famille des chambres** (`famille`) : `legumes` (frigos légumes : LP1, LP2, LP3, LBP, Zone prépa, Cellule carotte par défaut) ou `alliums` (toutes les autres). L'admin la règle dans Administration, rubrique Relevés de température. Si le champ manque (anciens réglages), il est déduit du nom. Dans les relevés, la tournée est affichée par groupe (frigos légumes, puis cellules alliums), et **seules les cellules alliums sont proposées pour le contrôle à cœur**. L'écriture est faite par le premier admin qui ouvre l'Administration ou les relevés. Les autres rôles voient cette liste par défaut sans l'écrire.
- **Archives** : au plus **400 lignes par archive**, à cause des limites Firestore (1 Mo par document, 500 opérations par lot). Il y a une archive par mois, et plusieurs si le mois dépasse 400 lignes. Pour les relevés, chaque archive est créée dans le **même lot d'écritures** que la suppression de ses relevés, donc tout ou rien. Pour l'historique du plan, c'est le même principe : une transaction par archive sur `planStockage/main`, qui crée l'archive et retire ses mouvements du seul champ `transactions`. Si l'archivage s'interrompt, les archives déjà faites sont complètes et on relance pour le reste. Firebase gratuit ne permet pas de tâche planifiée : l'archivage se lance à la main.
- **Lecture des archives** : pour un admin relevés qui n'est pas admin du plan, toute requête sur `archives` doit filtrer sur `type == 'releves'`, sinon les règles la refusent (c'est déjà le cas dans `admin.html` et `releves.html`).

## Administration (`admin.html`)

- **a) Comptes et accès** (admin du plan) : par compte, nom (facultatif), rôle plan et rôle relevés en listes déroulantes, enregistrement immédiat. Pour son propre compte, seul le nom est modifiable.
- **b) Plan de stockage** (admin du plan) : repris **à l'identique** des anciens onglets Cellules et Comptes. Mêmes textes, même tri alphabétique, mêmes contrôles et messages (doublons, stock présent, capacité inférieure au stock). Sauvegarde manuelle par export et import JSON. Chaque modification est enregistrée immédiatement par **transaction** : relecture de `planStockage/main`, contrôles refaits sur les données fraîches, puis seuls `cellules`, `produits` et `calibres` sont remplacés.
- **c) Relevés de température** (admin relevés ou admin du plan) : liste des motifs « hors cible – normal », chambres (famille Légumes ou Alliums, T° mini et maxi, hygrométrie mini et maxi) et produits du contrôle à cœur (mini et maxi), avec un bouton Enregistrer.
- **d) Archives et conservation** : durées réglables (les durées de l'historique du plan ne sont visibles que de l'admin du plan), boutons « Archiver maintenant », liste des archives, export Excel avec graphiques (relevés) ou CSV (mouvements), et JSON. Suppression seulement après l'échéance, avec confirmation.

## Relevés (`releves.html`)

- **Frigos** : tournée guidée (après chaque enregistrement, retour à la liste des chambres : la suivante non relevée, dans l'ordre affiché, est marquée « Proposée ensuite » en pointillés sans être ouverte ; le cadre d'une chambre relevée dans la journée devient vert, orange si hors cible – normal, rouge tant qu'une contre-mesure est à faire), état En service, Vide ou À l'arrêt, température avec échelle et cible, hygrométrie facultative, action corrective obligatoire en cas d'écart.
- **Produits** : contrôle à cœur de 1 à 5 mesures par produit, dans une cellule **alliums** uniquement, avec numéro de lot facultatif.
- **Historique, liste détaillée** : boutons Modifier / Supprimer dans la dernière colonne, fixée au bord droit sur ordinateur (la page s'élargit dans l'onglet Historique) ; sur téléphone (700 px ou moins), chaque relevé s'affiche en fiche, avec les boutons à droite.
- **Historique** : tableau du mois au format STOC E12.1 (dernier relevé du jour par chambre) ; un clic sur une case ouvre la ligne dans la liste détaillée. Filtres et export Excel. **Chambres affichées** : liste déroulante (toutes les chambres, tous les frigos légumes, toutes les cellules alliums, ou une seule chambre) ; le choix s'applique au tableau, à la liste et à l'export, et il est mémorisé sur le poste (`localStorage`). Un clic sur une case du tableau du mois ouvre la liste détaillée filtrée sur cette chambre, ligne mise en évidence ; « Revenir au tableau du mois » rétablit le choix d'avant.
- Avec le rôle Consultation, seul l'Historique est accessible.
- Une lecture refusée (par exemple les archives pour un non-admin) affiche un message simple, jamais d'erreur bloquante.
- **Opérateur** : par défaut, le compte connecté (champ `nom` de sa fiche `users`, sinon le début de l'e-mail). Une correction est mémorisée dans le `localStorage` du poste **pour ce compte seulement**.

## Règles Firestore (résumé)

Les règles du plan (`users`, `planStockage`) sont inchangées, à deux exceptions près : chacun peut modifier le seul champ `nom` de sa propre fiche `users` ; et la lecture de `planStockage` exige `estConnu()`, c'est-à-dire un compte connecté qui possède une fiche `users`, et un rôle plan différent de `none`. La lecture de sa propre fiche `users` reste autorisée. Ajouts :
- `releves` : lecture pour roleReleves viewer et plus, ou admin du plan. Création pour editor ou admin relevés, avec des champs validés, `uid` = auteur et `creeLe` = heure serveur. Modification (champs de mesure, de statut et de texte seulement) et suppression : par l'auteur pendant 24 h, ou par un admin relevés / admin du plan (suppression aussi utilisée par l'archivage).
- `temperatures` : lecture comme `releves`, écriture par un admin relevés ou un admin du plan.
- `archives` : lecture et création des archives de relevés par un admin relevés ou un admin du plan ; archives de mouvements réservées à l'admin du plan. Jamais modifiées. Suppression seulement si `expireLe` est dépassé.
- `parametres` : admins. Un admin relevés qui n'est pas admin du plan ne peut pas changer les durées de l'historique du plan.

## Style / thème

- Plan, accueil et administration : palette du logo **la légumière** (`--copper: #963E88`, vague `--wave-1`/`--wave-2`, polices Fraunces et Inter, icône oignon et échalote).
- Relevés : thème bleu-vert du module (police Barlow, `--brand: #1F5C63`), avec un mode sombre.
- Téléphone (390 px) : aucun débordement horizontal, zones tactiles d'au moins 44 px.

## Déploiement

- Projet Firebase de test : `stockage-plan-temp-test` (Spark/gratuit). La configuration est dans `index.html`, `plan.html`, `releves.html` et `admin.html` (et dans le prototype de référence).
- Le domaine GitHub Pages doit figurer dans Authentication, Settings, Authorized domains.
- Le dépôt est public : ce n'est pas un risque pour la configuration Firebase, qui n'est pas un secret. La sécurité repose sur Auth et les règles Firestore.

## Pour continuer le développement

- À chaque mise à jour publiée, incrémenter `VERSION` dans `index.html` : les liens de l'accueil ajoutent `?v=VERSION`, ce qui évite d'ouvrir une ancienne copie des modules gardée en cache.
- Toujours valider la syntaxe après édition : `node --check` sur le contenu de chaque `<script>` en ligne, et sur `xlsx-releves.js`.
- Garder `plan.html` aussi proche que possible de l'original. Une comparaison avec l'ancien `index.html` ne doit montrer que les retraits des deux onglets, la barre de module, la configuration Firebase et le blocage du rôle `none`.
- Pour tester sans toucher au projet réel : émulateur Firebase local (`firebase emulators:exec --only firestore,auth`), en faisant pointer les pages vers l'émulateur au moment du test.
