# Configuration Firebase (projet de test `stockage-plan-temp-test`)

L'application (accueil `index.html`, `plan.html`, `releves.html`, `admin.html`) a besoin d'un projet Firebase pour l'authentification et le partage des données en temps réel. Ce dépôt de test est branché sur le projet **`stockage-plan-temp-test`**. Sa configuration est déjà présente dans les quatre pages.

## 1. Créer le projet (déjà fait pour le test)

1. Va sur https://console.firebase.google.com et crée un projet (gratuit, offre "Spark").
2. Dans **Compilation > Authentication**, active la méthode de connexion **E-mail/Mot de passe**.
3. Dans **Compilation > Firestore Database**, crée une base en **mode production**.
4. Dans **Paramètres du projet > Général > Tes applications**, ajoute une application **Web** et copie l'objet `firebaseConfig`. Ces valeurs ne sont pas des secrets.
5. Pour changer de projet, remplace l'objet `firebaseConfig` dans `index.html`, `plan.html`, `releves.html` et `admin.html`. Les quatre doivent être identiques.

## 2. Publier les règles de sécurité

Dans **Firestore Database > Règles**, colle le contenu du fichier `firestore.rules` de ce dépôt, puis publie.

Les règles du plan de stockage sont inchangées :
- seuls les comptes connectés peuvent lire le plan ;
- seuls les rôles `editor` et `admin` peuvent l'écrire ;
- seul un `admin` lit la liste des comptes et change le rôle des autres ;
- personne ne modifie son propre compte.

Ajouts pour le module relevés (rôle lu dans le champ `roleReleves` de `users/{uid}`) :
- `releves` : lecture dès le rôle Consultation, création pour Gestion et Admin, jamais de modification, suppression par un admin pour l'archivage ;
- `temperatures` : réglages des relevés, écrits par un admin ;
- `archives` : réservées aux admins, suppression seulement après la date de conservation ;
- `parametres` : durées de conservation, réservées aux admins.

## 3. Créer les comptes utilisateurs

1. Dans **Authentication > Users**, clique sur **Ajouter un utilisateur** pour chaque personne (email et mot de passe temporaire).
2. Note l'**UID** généré pour chaque personne.
3. Dans **Firestore Database > Données**, crée une collection `users`. Pour chaque personne, crée un document dont l'**ID est son UID**, avec les champs suivants :
   - `email` (string) : son adresse, affichée dans Administration ;
   - `role` (string) : rôle dans le plan, `"admin"`, `"editor"` ou `"viewer"` ;
   - `roleReleves` (string, facultatif) : rôle dans les relevés, `"none"`, `"viewer"`, `"editor"` ou `"admin"`. Un champ absent vaut `"none"`.

Crée au moins un compte avec `role` = `"admin"` à la main. Ensuite, cet admin attribue les rôles des autres comptes depuis **Administration > Comptes et accès**, sans repasser par la console. Pour son propre compte, il faut toujours passer par la console.

## 4. Domaines autorisés

Dans **Authentication > Settings > Authorized domains**, ajoute le domaine d'hébergement, par exemple `fabianleg29.github.io` pour GitHub Pages. Sans cela, la connexion échoue.

## 5. Premiers pas sur le projet de test

1. Connecte-toi avec le compte admin : l'accueil propose Plan de stockage, Relevés des températures et Administration.
2. **Administration > Plan de stockage > Importer une sauvegarde** : choisis ta sauvegarde JSON du plan. Elle remplace tout le plan du projet de test. Ne dépose jamais ce fichier dans le dépôt GitHub.
3. **Administration > Relevés de température** : les 15 chambres de la fiche STOC E12.1 sont créées automatiquement à la première ouverture. Ajoute les produits du contrôle à cœur.
4. **Administration > Comptes et accès** : attribue les rôles des autres comptes.
5. Vérifie chaque rôle :
   - avec Gestion relevés : saisie des relevés ;
   - avec Consultation relevés : historique seul ;
   - avec Aucun accès : tuile Relevés grisée.
