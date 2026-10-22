# Passage en production : module Mouvements prestation (fiche E14.3)

Second correctif pour la production (`Plan_stockage_allium`). Il **s'applique après** `historique-plan.patch` : appliquez toujours celui-là d'abord.

## Contenu

| Fichier | Rôle |
|---|---|
| `mouvements-prestation.patch` | Ajoute le module : `mouvements.html` (nouveau), tuile sur l'accueil, rubrique et rôle dans l'Administration, règles `mouvements` et `prestation`, une ligne de commentaire dans `xlsx-releves.js`. Fait sur la production avec le correctif d'historique (commit `22b59eb` + `historique-plan.patch`). |

La configuration Firebase de `mouvements.html` n'est **pas** dans le correctif. À sa place, il y a une ligne `CONFIG_FIREBASE`. La session de production y recopie, à l'identique, le `firebaseConfig` de `plan.html`.

Ce qui n'est pas repris : la jauge et le bandeau de test.

## Aucune donnée existante touchée

- Le module ajoute deux **nouvelles** collections, `mouvements` et `prestation`, et un nouveau champ `roleMouvements` sur les comptes.
- Le plan, l'historique, les relevés, les archives et les rôles existants ne changent pas.
- Les règles existantes restent identiques : seuls les blocs `mouvements` et `prestation` sont ajoutés.

## Essais faits avant

Sur l'émulateur local, avec les fichiers de production des deux correctifs : **69 essais du module**, dont l'import du vrai fichier de la Google Sheet (204 lignes, 362 961 kg, sans doublon au second import). S'y ajoutent **18 essais des listes** et **36 essais de l'historique**. Tous sont réussis.

## Étapes après l'envoi par la session de production

1. **Règles** : publier `firestore.rules` du dépôt de production dans la console (projet `plan-de-stockage-alliums`).
2. **Ctrl+F5** sur les postes.
3. **Votre propre rôle mouvements** : un compte ne peut pas changer son propre rôle. Pour mettre votre compte en « Admin » mouvements, deux possibilités :
   - un autre admin du plan le fait dans Administration › Comptes et accès ;
   - ou vous le faites dans la console Firebase › Firestore › `users` › votre fiche : ajoutez le champ `roleMouvements` (texte) = `admin`.
4. **Rôles des autres comptes** : Administration › Comptes et accès, colonne « Mouvements prestation : rôle ». Les valeurs possibles sont Aucun accès, Consultation, Gestion (saisie) et Admin.
5. **Listes** : Administration › Mouvements prestation, onglets Prestataires, Variétés, Origines, Conditionnements, Responsables.
6. **Historique de la Google Sheet** : dans la Google Sheet, Fichier › Télécharger › CSV. Puis Administration › Mouvements prestation › **Importer le fichier CSV** : vérifiez l'aperçu, puis importez.
7. **Le jour où le Google Form est arrêté** : réimportez le CSV final. Seules les nouvelles lignes sont ajoutées, sans doublon.

## Retour arrière

Annuler le commit du correctif dans le dépôt de production (`git revert`), puis Ctrl+F5. Les mouvements déjà saisis restent dans Firebase, mais ne sont plus affichés.
