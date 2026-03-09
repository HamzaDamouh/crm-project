# 🎬 Démonstration Complète — Hamza Distribution CRM

> Ce document est un guide de démonstration pas à pas. Suivez chaque étape dans l'ordre pour
> découvrir toutes les fonctionnalités du logiciel. Chaque section explique **exactement quoi
> cliquer, quoi taper, et ce que vous devez voir à l'écran**.

---

## Avant de commencer

1. Ouvrez un terminal dans le dossier du projet
2. Lancez l'application :
   ```bash
   npm run dev
   ```
3. Ouvrez votre navigateur : **http://localhost:3000**

### État initial de la base de données

| Donnée | Quantité |
|--------|----------|
| Clients | 4 (+ 1 client générique « Client Divers ») |
| Fournisseur | 1 (Bosch Maroc) |
| Produits | 20 outils Bosch avec paliers tarifaires |
| Stock | Oui — entre 2 et 30 unités par produit |
| Transactions | 0 (base vierge) |
| Factures | 0 (base vierge) |

---

## Étape 1 — Explorer le Tableau de bord

**But :** Comprendre la page d'accueil et les indicateurs.

| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | L'application s'ouvre sur le **Tableau de bord** | 5 cartes statistiques, 2 graphiques, 1 tableau de factures vide |
| 2 | Regardez les cartes en haut | **Ventes totales : 0,00 MAD** — normal, on n'a rien vendu encore |
| 3 | Regardez « Alertes stock bas » | **2** produits en dessous du seuil (GWS 700 et GDX 180-LI) |
| 4 | Regardez « Ventes comptoir en attente » | **0** — aucune transaction enregistrée |
| 5 | Descendez jusqu'à « Alertes stock bas » | Vous voyez un tableau avec les 2 produits critique |

> 💡 Le badge rouge **0** apparaîtra sur « Transactions » et « Clôture mensuelle » dans la barre latérale une fois les premières transactions créées.

---

## Étape 2 — Créer une vente directe avec facture immédiate

**But :** Simuler une vente à un client professionnel qui paie directement.

**Le scénario :** L'entreprise *Chantier Atlas SARL* achète 3 meuleuses d'angle GWS 700 et 1 perforateur GBH 2-24 DRE.

| # | Action | Détails |
|---|--------|---------|
| 1 | Dans la barre latérale, cliquez **Transactions** | La page liste des transactions s'affiche (vide pour l'instant) |
| 2 | Cliquez le bouton **« + Nouvelle transaction »** (en haut à droite) | Le formulaire de nouvelle transaction s'ouvre |
| 3 | **Sélectionner le client :** Cliquez sur le champ « Rechercher un client... » | La liste déroulante s'ouvre avec tous les clients |
| 4 | Tapez **« Atlas »** | La liste se filtre et montre « Chantier Atlas SARL » |
| 5 | Cliquez sur **Chantier Atlas SARL** | Le client est sélectionné, son nom s'affiche dans le champ |
| 6 | **Ajouter le 1er produit :** Cliquez sur le champ « Rechercher par nom ou SKU... » | La liste des produits s'affiche |
| 7 | Tapez **« GWS 700 »** | La liste filtre et montre la meuleuse GWS 700 |
| 8 | Cliquez sur **GWS 700** | Le produit est sélectionné. Prix auto-renseigné : **516,00 MAD** (palier 1-9 unités) |
| 9 | Changez la **quantité** à **3** | Le prix reste 516,00 MAD (toujours dans le palier 1-9). Total ligne : **1 548,00 MAD** |
| 10 | Cliquez **« + Ajouter une ligne »** | Une nouvelle ligne vide apparaît dans le tableau |
| 11 | Dans la nouvelle ligne, tapez **« GBH 2-24 »** dans le champ produit | Le perforateur GBH 2-24 DRE apparaît |
| 12 | Cliquez sur **GBH 2-24 DRE** | Prix auto-renseigné : **2 094,00 MAD** |
| 13 | La quantité est déjà à **1**, c'est correct | |
| 14 | **Vérifiez le résumé en bas :** | |
| | Sous-total | **3 642,00 MAD** (1 548 + 2 094) |
| | TVA (20%) | **728,40 MAD** |
| | **Total** | **4 370,40 MAD** |
| 15 | Cliquez **« Générer une facture »** | ✅ Toast vert : « Facture générée avec succès ». Vous êtes redirigé vers la facture. |

**Ce qui s'est passé en arrière-plan :**
- Une facture a été créée avec le statut **« Impayé »**
- Le stock a diminué : GWS 700 passe de 3 → 0 unités, GBH 2-24 DRE passe de 12 → 11 unités
- Le solde du client Chantier Atlas SARL a augmenté de 4 370,40 MAD

> ⚠ Notez que le GWS 700 est maintenant à **0 unités** — il sera en alerte critique sur le tableau de bord !

---

## Étape 3 — Enregistrer des ventes à crédit (sans facture immédiate)

**But :** Simuler des ventes quotidiennes à un client qui paie en fin de mois.

**Le scénario :** L'entreprise *Bati-Pro Maroc* achète régulièrement à crédit. On enregistre 2 ventes séparées.

### Vente 1

| # | Action | Détails |
|---|--------|---------|
| 1 | Menu → **Transactions** → **« + Nouvelle transaction »** | |
| 2 | Client : tapez **« Bati »**, sélectionnez **Bati-Pro Maroc** | |
| 3 | Produit : tapez **« GSR 120 »**, sélectionnez **GSR 120-LI** | Prix : **1 449,00 MAD** |
| 4 | Quantité : changez à **2** | Total ligne : **2 898,00 MAD** |
| 5 | Vérifiez : Sous-total **2 898,00 MAD**, TVA **579,60 MAD**, Total **3 477,60 MAD** | |
| 6 | Cliquez **« Enregistrer la transaction »** | ✅ Toast vert : « Transaction enregistrée ». Le formulaire se réinitialise. |

> ⚡ **Différence importante :** « Enregistrer la transaction » ne crée PAS de facture. La vente est simplement notée comme « En attente ».

### Vente 2

| # | Action | Détails |
|---|--------|---------|
| 1 | Toujours sur le formulaire (il s'est réinitialisé) | |
| 2 | Client : resélectionnez **Bati-Pro Maroc** | |
| 3 | Produit : tapez **« GAS »**, sélectionnez **GAS 35 L SFC+** | Prix : **8 489,00 MAD** |
| 4 | Quantité : laissez à **1** | Total ligne : **8 489,00 MAD** |
| 5 | Cliquez **« Enregistrer la transaction »** | ✅ Toast vert. |

**Vérification :**
| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | Menu → **Transactions** | La page liste montre maintenant 2 transactions |
| 2 | En haut : « Valeur en attente » | **11 387,00 MAD** et « Nombre en attente : **2** » |
| 3 | Les deux transactions ont le badge **« En attente »** (orange) | |
| 4 | Regardez le badge dans la barre latérale | Un badge rouge **2** sur Transactions et Clôture mensuelle |

---

## Étape 4 — Clôture mensuelle (facturation groupée)

**But :** Regrouper les 2 transactions de Bati-Pro Maroc en une seule facture consolidée.

| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | Menu → **Clôture mensuelle** | Page avec en-tête « Clôture mensuelle — mars 2026 » |
| 2 | En haut : alerte jaune | « **2 transaction(s) non traitée(s)** » |
| 3 | Le tableau montre les 2 transactions avec : | |
| | Ligne 1 | GSR 120-LI • Qté 2 • 1 449,00 MAD • Total : 2 898,00 MAD |
| | Ligne 2 | GAS 35 L SFC+ • Qté 1 • 8 489,00 MAD • Total : 8 489,00 MAD |
| 4 | Les deux lignes sont ✅ cochées par défaut | |
| 5 | **Optionnel :** modifiez un prix | Cliquez sur le champ prix de la ligne GSR 120-LI, changez à **1 400**. Le champ devient bleu et l'ancien prix est barré. |
| 6 | En dessous, le résumé montre le nouveau total | Sous-total ajusté, TVA, Total |
| 7 | **Étape 2 — Client :** cliquez « Rechercher un client... » | |
| 8 | Tapez **« Bati »**, sélectionnez **Bati-Pro Maroc** | |
| 9 | Cliquez **« Générer la facture consolidée »** | ✅ Toast vert. Redirigé vers la facture consolidée. |

**Ce qui s'est passé :**
- Les 2 transactions passent au statut **« Facturé »**
- Une seule facture consolidée est créée pour Bati-Pro Maroc
- Le solde de Bati-Pro Maroc augmente du montant total TTC

---

## Étape 5 — Explorer les factures

**But :** Voir toutes les factures et utiliser les filtres.

| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | Menu → **Factures** | 2 factures : Chantier Atlas (Étape 2) et Bati-Pro Maroc (Étape 4) |
| 2 | Les deux ont le badge 🔴 **« Impayé »** | Aucun paiement enregistré encore |
| 3 | Utilisez le filtre **« Statut »** → sélectionnez **« Impayées »** | Seules les factures impayées s'affichent |
| 4 | Remettez le filtre sur **« Tous statuts »** | |
| 5 | Cliquez sur la ligne de la facture **Chantier Atlas** | La page de détail s'ouvre |
| 6 | Vous voyez : | |
| | En-tête | Informations client + numéro de facture |
| | Lignes | 2 lignes (GWS 700 ×3 + GBH 2-24 DRE ×1) |
| | Résumé | Sous-total, TVA, Total |
| | Paiements | Section vide — « Aucun paiement enregistré » |

---

## Étape 6 — Enregistrer un paiement complet

**But :** Solder la facture de Chantier Atlas SARL.

| # | Action | Détails |
|---|--------|---------|
| 1 | Sur la page de détail de la facture Chantier Atlas | |
| 2 | Cliquez le bouton **« Enregistrer un paiement »** | Un formulaire modal s'ouvre |
| 3 | **Montant :** pré-rempli avec le solde dû (4 370,40 MAD) | Laissez tel quel pour un paiement complet |
| 4 | **Méthode :** sélectionnez **« Espèces »** | |
| 5 | **Date :** la date du jour est pré-remplie | |
| 6 | Cliquez **« Enregistrer un paiement »** | ✅ Toast vert : « Paiement enregistré » |
| 7 | La page se rafraîchit | Le statut passe à 🟢 **« Payé »**, le solde est à **0,00 MAD** |

---

## Étape 7 — Enregistrer un paiement partiel

**But :** Simuler un client qui paie une partie de sa facture.

| # | Action | Détails |
|---|--------|---------|
| 1 | Menu → **Factures** → Cliquez sur la facture **Bati-Pro Maroc** | |
| 2 | Cliquez **« Enregistrer un paiement »** | |
| 3 | **Montant :** changez à **5 000,00** (au lieu du total complet) | Paiement partiel |
| 4 | **Méthode :** sélectionnez **« Chèque »** | Un champ « Numéro de chèque » apparaît |
| 5 | **N° de chèque :** tapez **« CHQ-2026-001 »** | |
| 6 | Cliquez **« Enregistrer un paiement »** | ✅ Toast vert |
| 7 | Le statut passe à 🟡 **« Partiel »** | Le solde restant est affiché |
| 8 | La section « Historique des paiements » montre le chèque de 5 000 MAD | |

---

## Étape 8 — Vérifier le Tableau de bord mis à jour

**But :** Voir comment les indicateurs se mettent à jour automatiquement.

| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | Menu → **Tableau de bord** | |
| 2 | **Ventes totales ce mois** | Le montant de la facture Atlas (payée ce mois) |
| 3 | **Factures impayées** | Le solde restant de Bati-Pro Maroc |
| 4 | **Alertes stock bas** | Plus que 2 ou 3 produits (le GWS 700 est maintenant à 0 !) |
| 5 | **Ventes comptoir en attente** | **0** (les 2 transactions ont été facturées) |
| 6 | **Graphique « Âge des créances »** | La barre « 0-30 jours » montre le solde de Bati-Pro |
| 7 | **Graphique « Meilleurs clients »** | Chantier Atlas apparaît (seul client ayant payé) |
| 8 | **Factures récentes** | Les 2 factures. Atlas = Payé. Bati-Pro = Partiel avec bouton « Payer » |

---

## Étape 9 — Consulter le Stock

**But :** Voir l'impact des ventes sur l'inventaire.

| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | Menu → **Stock** | |
| 2 | En haut : **Alertes de stock** (cartes rouges) | GWS 700 en **Critique** (0 unités), GDX 180-LI en **Critique** (2 unités) |
| 3 | Le tableau d'inventaire montre tous les 20 produits | |
| 4 | Cherchez **« GWS »** dans la barre de recherche | Filtre instantané → GWS 700 (stock: 0), GWS 9-115 (stock: 20), GWS 14-125 S (stock: 10) |
| 5 | Cliquez sur la ligne **GWS 700** | Un panneau latéral s'ouvre à droite |
| 6 | Le panneau montre : | |
| | Stock actuel | **0** unité (en rouge) |
| | Minimum | 5 unités |
| | Historique | 2 mouvements : ↓ Entrée initiale (+3), ↑ Sortie vente (-3) |

---

## Étape 10 — Réapprovisionner le stock (Bon de commande)

**But :** Commander du stock au fournisseur pour le GWS 700 qui est à 0.

| # | Action | Détails |
|---|--------|---------|
| 1 | Menu → **Tableau de bord** | |
| 2 | Descendez jusqu'à « Alertes stock bas » | |
| 3 | Cliquez sur la ligne **GWS 700** | Redirigé vers le formulaire de bon de commande, le produit est pré-rempli |
| 4 | **Fournisseur :** cliquez « Rechercher... », sélectionnez **Bosch Maroc** | |
| 5 | Le produit **GWS 700** est déjà ajouté | |
| 6 | **Quantité :** tapez **20** | |
| 7 | **Coût unitaire :** tapez **380** (prix d'achat fournisseur) | |
| 8 | **Référence :** tapez **« PO-2026-001 »** | |
| 9 | **Date de commande :** sélectionnez aujourd'hui | |
| 10 | **Date de livraison :** sélectionnez dans 1 semaine | |
| 11 | Cliquez **« Soumettre le bon de commande »** | ✅ Toast vert : « Bon de commande créé ». |

> 📦 Quand la livraison arrive, le bon de commande est marqué « Reçu » et le stock est automatiquement mis à jour (GWS 700 passera de 0 → 20 unités).

---

## Étape 11 — Consulter un client

**But :** Voir la fiche détaillée d'un client et son historique.

| # | Action | Ce que vous voyez |
|---|--------|-------------------|
| 1 | Menu → **Clients** | Liste des 4 clients (sans le fournisseur) |
| 2 | Vous voyez les colonnes : Nom, Type, Total facturé, Total payé, Solde dû | |
| 3 | **Bati-Pro Maroc** a un solde dû en rouge (paiement partiel de l'étape 7) | |
| 4 | Cliquez sur **Bati-Pro Maroc** | Page de détail du client |
| 5 | Sections visibles : | |
| | Informations | Nom, type, contact |
| | Solde impayé | Le montant restant après le paiement partiel |
| | Factures | La facture consolidée avec badge « Partiel » |
| | Paiements | Le chèque CHQ-2026-001 de 5 000 MAD |

---

## Étape 12 — Paiement via transfert de dette (fonctionnalité avancée)

**But :** Un client B paie la facture d'un client A. C'est la fonctionnalité de « transfert de dette ».

**Le scénario :** *M. Karim Benjelloun* décide de payer le solde restant de la facture de *Bati-Pro Maroc*.

| # | Action | Détails |
|---|--------|---------|
| 1 | Menu → **Factures** → Cliquez sur la facture **Bati-Pro Maroc** | |
| 2 | Cliquez **« Enregistrer un paiement »** | |
| 3 | **Montant :** laissez le solde restant (pré-rempli) | |
| 4 | **Méthode :** sélectionnez **« Déduire du solde d'un autre client »** | Un nouveau champ de recherche apparaît |
| 5 | Dans « Déduire de : », tapez **« Karim »** | |
| 6 | Sélectionnez **M. Karim Benjelloun** | |
| 7 | Cliquez **« Enregistrer un paiement »** | ✅ Toast vert |
| 8 | La facture Bati-Pro passe à 🟢 **Payé** | |

**Ce qui s'est passé :**
- Le solde de Bati-Pro Maroc est soldé → 0 MAD
- Le solde de M. Karim Benjelloun AUGMENTE du montant payé (c'est maintenant LUI qui doit cet argent)
- Un transfert de dette est enregistré dans le système

---

## Récapitulatif de la démo

Voici tout ce que vous avez couvert :

| Étape | Fonctionnalité testée | Résultat attendu |
|-------|----------------------|------------------|
| 1 | Tableau de bord | Vue d'ensemble, indicateurs à zéro |
| 2 | Vente directe avec facture | Facture créée, stock déduit |
| 3 | Vente à crédit (transaction en attente) | 2 transactions en attente |
| 4 | Clôture mensuelle | Facture consolidée générée |
| 5 | Liste des factures + filtres | 2 factures visibles, filtres fonctionnels |
| 6 | Paiement complet | Facture soldée (badge Payé) |
| 7 | Paiement partiel par chèque | Facture partiellement payée (badge Partiel) |
| 8 | Tableau de bord mis à jour | Statistiques reflètent les données réelles |
| 9 | Stock et inventaire | Mouvements visibles, alertes présentes |
| 10 | Bon de commande fournisseur | Réapprovisionnement initié |
| 11 | Fiche client | Historique factures et paiements |
| 12 | Transfert de dette | Client tiers paie une facture |

> 🎉 **Félicitations !** Vous avez fait le tour complet de l'application Hamza Distribution.
