# Configuration Firebase

L'application (`index.html`) a besoin d'un projet Firebase pour l'authentification et le partage des données en temps réel.

## 1. Créer le projet

1. Va sur https://console.firebase.google.com et crée un projet (gratuit, offre "Spark").
2. Dans **Compilation > Authentication**, active la méthode de connexion **E-mail/Mot de passe**.
3. Dans **Compilation > Firestore Database**, crée une base en **mode production**.
4. Dans **Paramètres du projet > Général > Tes applications**, ajoute une application **Web** et copie l'objet `firebaseConfig` (apiKey, authDomain, projectId, etc. — ce ne sont pas des secrets, ils peuvent être publics dans le code).
5. Colle ces valeurs dans `index.html`, à la place des `"REMPLACER..."` (tout en haut du `<script>`, juste après les balises Firebase).

## 2. Publier les règles de sécurité

Dans **Firestore Database > Règles**, colle le contenu du fichier `firestore.rules` de ce dépôt, puis publie.

Ces règles garantissent que :
- seuls les comptes connectés peuvent lire les données du plan de stockage ;
- seuls les comptes avec le rôle `editor` ou `admin` peuvent écrire (créer/modifier/supprimer un palox, changer la config des cellules) ;
- seul un compte `admin` peut lire la liste complète des comptes (collection `users`) et changer le rôle d'un autre compte ;
- personne ne peut modifier son propre rôle, même un admin (pour éviter de se bloquer soi-même par erreur) — un changement sur son propre compte doit toujours passer par la console Firebase.

Il y a trois rôles possibles :
- `admin` — tout ce que fait `editor`, plus l'accès à l'onglet "Comptes" pour voir la liste des comptes et changer leur rôle.
- `editor` — gestion complète du stock (lecture/écriture).
- `viewer` — consultation seule. C'est le rôle par défaut si aucun document `users/{uid}` n'existe pour ce compte.

## 3. Créer les comptes utilisateurs

1. Dans **Authentication > Users**, clique sur **Ajouter un utilisateur** pour chaque personne (email + mot de passe temporaire — elle pourra le changer plus tard via "mot de passe oublié" si tu actives cette option).
2. Note l'**UID** généré pour chaque personne.
3. Dans **Firestore Database > Données**, crée une collection `users`. Pour chaque personne, crée un document dont l'**ID du document est son UID**, avec deux champs :
   - `email` (string) — son adresse email, utilisée uniquement pour l'afficher dans l'onglet "Comptes"
   - `role` (string) = `"admin"`, `"editor"` ou `"viewer"`

Crée au moins un compte `admin` de cette façon (le tout premier doit être créé à la main — ensuite, les admins peuvent changer les rôles des autres comptes directement depuis l'onglet "Comptes" de l'application, sans repasser par la console).

## 4. Domaines autorisés

Dans **Authentication > Settings > Authorized domains**, ajoute le domaine où `index.html` sera hébergé (ex : `tonorg.github.io` si tu utilises GitHub Pages).

## 5. Tester

Ouvre `index.html` dans un navigateur, connecte-toi avec un compte `editor` : tu dois pouvoir ajouter/sortir/déplacer des palox, mais pas voir les onglets "Cellules" et "Comptes" (réservés à l'admin). Avec un compte `admin`, tu dois en plus voir ces deux onglets, pouvoir configurer les cellules/lignes et changer le rôle des autres comptes. Avec un compte `viewer`, les actions de gestion doivent être masquées et les onglets "Cellules"/"Comptes" absents.
