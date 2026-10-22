# Passage en production : historique du plan en documents séparés

Ce dossier prépare, pour la **production** (`Plan_stockage_allium`), la nouvelle organisation de l'historique du plan déjà en place dans le dépôt de test : **une ligne d'historique = un document** (collection `planHistorique`). Le document du plan (`planStockage/main`) ne contient plus que les cellules et les palox. Il ne grossit plus avec le temps, et l'archivage de l'historique du plan n'est plus nécessaire.

Rien ici ne touche la production tout seul. C'est la session Claude Code **du dépôt de production** qui applique le correctif, après votre accord.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `historique-plan.patch` | Le correctif, prêt à appliquer sur la production (commit `22b59eb` du 22/10/2026). Il ne contient **aucune configuration Firebase** : celle de la production reste en place. |
| `PROCEDURE-HISTORIQUE.md` | Ce document. |

## Ce que change le correctif

| Fichier | Changement |
|---|---|
| `plan.html` | Chaque action enregistre le plan et sa ligne d'historique ensemble (tout ou rien). Onglet Historique : 30 derniers jours par défaut, dates Du / Au pour remonter plus loin, bouton « Exporter en Excel ». Si les nouvelles règles ne sont pas encore publiées, l'historique est enregistré dans le plan comme avant. |
| `admin.html` | Plan de stockage : carte « Transférer l'historique » (visible seulement tant qu'il reste des lignes dans le plan). Archives : plus d'archivage de l'historique du plan ; les archives déjà faites restent lisibles, leur CSV a la colonne lot2. |
| `index.html` | Le rappel « Archivage à faire » ne concerne plus que les relevés. |
| `firestore.rules` | Ajout du bloc `planHistorique` (le reste est inchangé). |
| `xlsx-releves.js` | Ajout du classeur simple (`tableau`) et du style date, pour l'export Excel de l'historique. Rien ne change pour les relevés. |

La **jauge de remplissage** du dépôt de test n'est pas reprise : elle n'existe pas en production, et elle n'est plus utile. Avec 1 000 palox, le plan occupe environ 28 % de la limite Firebase. Il faudrait environ 3 600 palox en même temps pour l'atteindre.

## Essais faits avant

Sur l'émulateur local, avec les fichiers de production adaptés (configuration remplacée par celle du test pour l'essai seulement) : **36 essais réussis**. Ils couvrent :
- les règles ;
- l'affichage et les dates ;
- l'export Excel ;
- le transfert, puis sa relance sans doublon ;
- une ancienne version de la page ouverte en même temps ;
- deux postes en même temps ;
- les droits Consultation et Admin ;
- le téléphone ;
- les règles non publiées.

## Étapes, dans l'ordre

1. **Choisir un moment calme** : personne ne travaille dans le plan.
2. **Sauvegarde** : dans l'application de production, Administration › Plan de stockage › **Exporter une sauvegarde (.json)**. Gardez le fichier sur votre poste, jamais dans GitHub.
3. **Session Claude Code de production** : ouvrez une session sur le dépôt `Plan_stockage_allium` et collez la consigne ci-dessous. Elle applique le correctif, vous montre le résumé, puis pousse après votre accord.
4. **Règles** : console Firebase › projet **plan-de-stockage-alliums** › Firestore › Règles. Remplacez le texte par celui du fichier `firestore.rules` du dépôt de production (mis à jour à l'étape 3), puis **Publier**.
5. **Ctrl+F5** sur chaque poste (ordinateurs, tablettes, téléphones).
6. **Transfert** : Administration › Plan de stockage › **Transférer l'historique**. Attendez le message « … lignes d'historique transférées et vérifiées ». La carte disparaît alors.
7. **Contrôle** :
   - les palox sont les mêmes (onglets Stockage et Stock global) ;
   - l'onglet Historique affiche les 30 derniers jours ; changez la date Du pour voir les plus anciennes ;
   - faites une entrée, ou une sortie de test, et vérifiez qu'elle apparaît.

Entre les étapes 3 et 4, l'application fonctionne : tant que les règles ne sont pas publiées, l'historique s'enregistre dans le plan comme avant, puis le transfert le déplace.

## Consigne à coller dans la session Claude Code de production

> Applique dans ce dépôt, sur la branche publiée `claude/stockage-echalotes-oignons-6m4x91`, le correctif préparé et testé dans le dépôt de test : https://raw.githubusercontent.com/FabianLeg29/STOCKAGE-PLAN-TEMP-TEST/main/production/historique-plan.patch (procédure : `production/PROCEDURE-HISTORIQUE.md` du même dépôt). Il a été fait sur le commit `22b59eb`.
> 1. Télécharge le fichier, puis `git apply --check` et `git apply`. Si des commits plus récents gênent, utilise `git apply --3way` et garde les deux changements. Ne touche pas à la configuration Firebase : le correctif n'en contient pas.
> 2. Incrémente `VERSION` dans `index.html`. Valide la syntaxe (`node --check` sur chaque `<script>` en ligne et sur `xlsx-releves.js`). Vérifie qu'il n'y a aucune trace de `stockage-plan-temp-test`.
> 3. Mets à jour `CLAUDE.md` en reprenant ce qui concerne `planHistorique` dans le `CLAUDE.md` du dépôt de test (données Firestore, paragraphe « Historique du plan dans planHistorique », règles, administration, archives, règle 3, et l'écart volontaire de `plan.html` par rapport à `ancien-plan.html`). Ne reprends ni la jauge, ni le module mouvements prestation, ni le bandeau de test.
> 4. Montre-moi le résumé des changements. Attends mon accord avant de pousser.

## Retour arrière

- **Avant le transfert** : annulez le commit dans le dépôt de production (`git revert`), puis Ctrl+F5. Les lignes écrites entre-temps dans `planHistorique` restent dans Firebase, mais l'ancienne version ne les affiche pas.
- **Après le transfert** : même chose. L'historique transféré reste en sécurité dans `planHistorique`, et la sauvegarde de l'étape 2 le contient aussi. **N'importez pas** cette sauvegarde pour revenir en arrière : elle remettrait aussi les palox dans l'état d'avant.

## Plus tard

Quand tous les postes auront la nouvelle version depuis quelques semaines, sans incident, on pourra retirer le code du bouton de transfert, en test puis en production.
