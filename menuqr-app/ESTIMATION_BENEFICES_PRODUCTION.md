# Estimation des Bénéfices - MenuQR

## Hypothèses de Base

- **500 restaurants** inscrits
- **50 hôtels** inscrits
- **Total**: 550 établissements
- Taux de change: 1 USD = 600 FCFA

---

## 1. Revenus des Abonnements

### A. Restaurants (500 établissements)

| Pack | Prix/mois | % adoption | Nombre | Revenu mensuel |
|------|-----------|------------|--------|----------------|
| **Essentiel** (10-25 couverts) | 15 000 FCFA | 40% | 200 | 3 000 000 FCFA |
| **Confort** (25-60 couverts) | 25 000 FCFA | 40% | 200 | 5 000 000 FCFA |
| **Premium** (60+ couverts) | 45 000 FCFA | 20% | 100 | 4 500 000 FCFA |
| **TOTAL Restaurants** | - | 100% | 500 | **12 500 000 FCFA** |

### B. Hôtels (50 établissements)

| Pack | Prix/mois | % adoption | Nombre | Revenu mensuel |
|------|-----------|------------|--------|----------------|
| **Essentiel** (10-25 chambres) | 20 000 FCFA | 30% | 15 | 300 000 FCFA |
| **Confort** (25-60 chambres) | 35 000 FCFA | 50% | 25 | 875 000 FCFA |
| **Premium** (60+ chambres) | 60 000 FCFA | 20% | 10 | 600 000 FCFA |
| **TOTAL Hôtels** | - | 100% | 50 | **1 775 000 FCFA** |

### C. Total Abonnements Mensuels

| Catégorie | Revenu mensuel | Revenu annuel |
|-----------|----------------|---------------|
| Restaurants | 12 500 000 FCFA | 150 000 000 FCFA |
| Hôtels | 1 775 000 FCFA | 21 300 000 FCFA |
| **TOTAL ABONNEMENTS** | **14 275 000 FCFA** | **171 300 000 FCFA** |

---

## 2. Revenus des Options Payantes (Upsells)

### A. Paiement Mobile Money (Commission 1-2%)

**Hypothèses:**
- 30% des établissements activent le paiement mobile
- Panier moyen restaurant: 5 000 FCFA
- Panier moyen hôtel (room service): 15 000 FCFA
- 100 transactions/mois par établissement actif

| Type | Établissements actifs | Transactions/mois | Volume | Commission 1.5% |
|------|----------------------|-------------------|--------|-----------------|
| Restaurants | 150 | 15 000 | 75 000 000 FCFA | 1 125 000 FCFA |
| Hôtels | 15 | 1 500 | 22 500 000 FCFA | 337 500 FCFA |
| **TOTAL** | 165 | 16 500 | 97 500 000 FCFA | **1 462 500 FCFA** |

### B. Options Additionnelles

| Option | Prix/mois | % adoption | Nombre | Revenu mensuel |
|--------|-----------|------------|--------|----------------|
| Petit-déjeuner en chambre (hôtels) | 5 000 FCFA | 60% | 30 | 150 000 FCFA |
| Service Laundry (hôtels) | 5 000 FCFA | 40% | 20 | 100 000 FCFA |
| URL personnalisée | 833 FCFA/mois (10 000/an) | 20% | 110 | 91 630 FCFA |
| Menu bar séparé (restaurants) | 3 000 FCFA | 15% | 75 | 225 000 FCFA |
| **TOTAL Options** | - | - | - | **566 630 FCFA** |

### C. Campagnes SMS Marketing

| Volume campagne | Prix/campagne | Campagnes/mois | % utilisant | Revenu mensuel |
|-----------------|---------------|----------------|-------------|----------------|
| Pack 500 SMS | 15 000 FCFA | 2 | 20% (110) | 3 300 000 FCFA |
| Pack 1000 SMS | 25 000 FCFA | 1 | 10% (55) | 1 375 000 FCFA |
| Pack 2500 SMS | 50 000 FCFA | 0.5 | 5% (27) | 675 000 FCFA |
| **TOTAL Campagnes SMS** | - | - | - | **5 350 000 FCFA** |

> Note: Marge sur SMS = Prix vendu - Coût réel (~15 FCFA/SMS)
> - Pack 500: 15 000 - 7 500 = 7 500 FCFA de marge
> - Pack 1000: 25 000 - 15 000 = 10 000 FCFA de marge
> - Pack 2500: 50 000 - 37 500 = 12 500 FCFA de marge

**Marge nette sur campagnes SMS**: ~2 675 000 FCFA/mois

### D. Total Revenus Options

| Source | Revenu brut mensuel |
|--------|---------------------|
| Commissions Mobile Money | 1 462 500 FCFA |
| Options additionnelles | 566 630 FCFA |
| Campagnes SMS (marge nette) | 2 675 000 FCFA |
| **TOTAL OPTIONS** | **4 704 130 FCFA** |

---

## 3. Revenus Totaux

| Source de revenus | Mensuel | Annuel |
|-------------------|---------|--------|
| Abonnements | 14 275 000 FCFA | 171 300 000 FCFA |
| Options payantes | 4 704 130 FCFA | 56 449 560 FCFA |
| **TOTAL REVENUS** | **18 979 130 FCFA** | **227 749 560 FCFA** |

---

## 4. Calcul des Bénéfices

### A. Rappel des Coûts (du document précédent)

| Catégorie | Coût mensuel | Coût annuel |
|-----------|--------------|-------------|
| Infrastructure (API, DB, etc.) | 73 850 FCFA | 886 200 FCFA |
| SMS opérationnels (OTP, confirmations) | 1 500 000 FCFA | 18 000 000 FCFA |
| Marge imprévus (10%) | 157 385 FCFA | 1 888 620 FCFA |
| **TOTAL COÛTS** | **1 731 235 FCFA** | **20 774 820 FCFA** |

### B. Scénario avec SMS optimisé (WhatsApp + OTP)

| Catégorie | Coût mensuel | Coût annuel |
|-----------|--------------|-------------|
| Infrastructure | 73 850 FCFA | 886 200 FCFA |
| SMS OTP uniquement | 50 000 FCFA | 600 000 FCFA |
| Marge imprévus (10%) | 12 385 FCFA | 148 620 FCFA |
| **TOTAL COÛTS OPTIMISÉS** | **136 235 FCFA** | **1 634 820 FCFA** |

### C. Bénéfice Net

#### Scénario 1: Coûts complets (SMS inclus)

| Élément | Mensuel | Annuel |
|---------|---------|--------|
| Revenus totaux | 18 979 130 FCFA | 227 749 560 FCFA |
| Coûts totaux | 1 731 235 FCFA | 20 774 820 FCFA |
| **BÉNÉFICE NET** | **17 247 895 FCFA** | **206 974 740 FCFA** |
| **Marge bénéficiaire** | **90.9%** | **90.9%** |

#### Scénario 2: Coûts optimisés (WhatsApp + OTP)

| Élément | Mensuel | Annuel |
|---------|---------|--------|
| Revenus totaux | 18 979 130 FCFA | 227 749 560 FCFA |
| Coûts totaux | 136 235 FCFA | 1 634 820 FCFA |
| **BÉNÉFICE NET** | **18 842 895 FCFA** | **226 114 740 FCFA** |
| **Marge bénéficiaire** | **99.3%** | **99.3%** |

---

## 5. Analyse de Rentabilité

### A. Point Mort (Break-Even)

**Avec coûts complets (1 731 235 FCFA/mois):**

| Pack | Prix moyen | Établissements nécessaires |
|------|------------|---------------------------|
| Mix actuel | 25 955 FCFA | **67 établissements** |

> Avec seulement **67 établissements** (12% de 550), les coûts sont couverts.

**Avec coûts optimisés (136 235 FCFA/mois):**

| Pack | Prix moyen | Établissements nécessaires |
|------|------------|---------------------------|
| Mix actuel | 25 955 FCFA | **6 établissements** |

> Avec seulement **6 établissements**, les coûts sont couverts!

### B. Retour sur Investissement (ROI)

**Investissement initial estimé (développement + lancement):**

| Poste | Coût estimé |
|-------|-------------|
| Développement (6 mois dev) | 15 000 000 FCFA |
| Design UI/UX | 2 000 000 FCFA |
| Infrastructure initiale | 500 000 FCFA |
| Marketing lancement | 3 000 000 FCFA |
| Juridique/Admin | 500 000 FCFA |
| **TOTAL INVESTISSEMENT** | **21 000 000 FCFA** |

**Délai de récupération:**

| Scénario | Bénéfice mensuel | Mois pour récupérer |
|----------|------------------|---------------------|
| Coûts complets | 17 247 895 FCFA | **1.2 mois** |
| Coûts optimisés | 18 842 895 FCFA | **1.1 mois** |

> L'investissement initial est récupéré en **moins de 2 mois**!

---

## 6. Projections de Croissance

### A. Scénario de croissance sur 3 ans

| Année | Restaurants | Hôtels | Total | Revenu annuel | Bénéfice annuel |
|-------|-------------|--------|-------|---------------|-----------------|
| Année 1 | 500 | 50 | 550 | 227 749 560 FCFA | 206 974 740 FCFA |
| Année 2 (+50%) | 750 | 75 | 825 | 341 624 340 FCFA | 318 699 520 FCFA |
| Année 3 (+50%) | 1125 | 112 | 1237 | 512 436 510 FCFA | 487 049 280 FCFA |

### B. Graphique de progression

```
Bénéfice annuel (en millions FCFA)

500M ┤                                    ████████
450M ┤                                    ████████
400M ┤                                    ████████
350M ┤                        ████████    ████████
300M ┤                        ████████    ████████
250M ┤                        ████████    ████████
200M ┤            ████████    ████████    ████████
150M ┤            ████████    ████████    ████████
100M ┤            ████████    ████████    ████████
 50M ┤            ████████    ████████    ████████
   0 ┼────────────────────────────────────────────
              Année 1      Année 2      Année 3
                207M         319M         487M
```

---

## 7. Indicateurs Clés de Performance (KPIs)

### A. Métriques Financières

| Indicateur | Valeur |
|------------|--------|
| Revenu moyen par établissement (ARPU) | 34 507 FCFA/mois |
| Coût d'acquisition client (CAC) estimé | 50 000 FCFA |
| Valeur vie client (LTV) sur 24 mois | 828 168 FCFA |
| Ratio LTV/CAC | **16.6x** |
| Marge brute | **90.9%** |
| Marge nette (après impôts 25%) | **68.2%** |

### B. Métriques Opérationnelles

| Indicateur | Valeur |
|------------|--------|
| Taux de rétention estimé | 85%/an |
| Churn mensuel | 1.25% |
| Temps de récupération CAC | < 2 mois |
| Revenu récurrent mensuel (MRR) | 18 979 130 FCFA |
| Revenu récurrent annuel (ARR) | 227 749 560 FCFA |

---

## 8. Répartition des Bénéfices Suggérée

### Allocation mensuelle des bénéfices (~17 250 000 FCFA)

| Poste | % | Montant mensuel |
|-------|---|-----------------|
| Réinvestissement (R&D, nouvelles fonctionnalités) | 20% | 3 450 000 FCFA |
| Marketing et acquisition clients | 15% | 2 587 500 FCFA |
| Réserve de trésorerie | 10% | 1 725 000 FCFA |
| Salaires et charges équipe | 25% | 4 312 500 FCFA |
| Distribution aux associés | 30% | 5 175 000 FCFA |
| **TOTAL** | 100% | **17 250 000 FCFA** |

### Équipe suggérée (avec 4 312 500 FCFA/mois)

| Poste | Nombre | Salaire/personne | Total |
|-------|--------|------------------|-------|
| Développeur Full Stack | 2 | 800 000 FCFA | 1 600 000 FCFA |
| Commercial/Acquisition | 2 | 500 000 FCFA | 1 000 000 FCFA |
| Support Client | 2 | 350 000 FCFA | 700 000 FCFA |
| Marketing Digital | 1 | 500 000 FCFA | 500 000 FCFA |
| Comptable/Admin | 1 | 400 000 FCFA | 400 000 FCFA |
| **TOTAL Équipe** | **8 personnes** | - | **4 200 000 FCFA** |

---

## 9. Analyse des Risques et Opportunités

### Risques

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Concurrence (Glovo, etc.) | Élevé | Moyenne | Focus sur la valeur ajoutée locale |
| Churn élevé | Moyen | Faible | Programme de fidélité, support réactif |
| Problèmes techniques | Moyen | Faible | Infrastructure redondante, monitoring |
| Réglementation | Faible | Faible | Veille juridique, conformité |

### Opportunités

| Opportunité | Potentiel | Effort |
|-------------|-----------|--------|
| Expansion régionale (Côte d'Ivoire, Mali) | +100% revenus | Moyen |
| Intégration livraison | +30% revenus | Élevé |
| Programme fidélité clients | +15% rétention | Faible |
| API pour intégrateurs | +20% revenus | Moyen |
| Marketplace fournisseurs | Nouveau business | Élevé |

---

## 10. Résumé Exécutif

### Chiffres Clés (550 établissements)

| Indicateur | Mensuel | Annuel |
|------------|---------|--------|
| **Revenus** | 18 979 130 FCFA | 227 749 560 FCFA |
| **Coûts** | 1 731 235 FCFA | 20 774 820 FCFA |
| **Bénéfice Net** | **17 247 895 FCFA** | **206 974 740 FCFA** |
| **Marge** | **90.9%** | **90.9%** |

### Points Forts du Modèle

1. **Excellente marge** (~91%) typique des SaaS
2. **Revenus récurrents** prévisibles
3. **Point mort très bas** (67 établissements)
4. **ROI rapide** (< 2 mois)
5. **Scalabilité** élevée (coûts marginaux faibles)
6. **Multiple sources de revenus** (abonnements + commissions + options)

### Conclusion

Avec **500 restaurants et 50 hôtels**, MenuQR peut générer:

- **~207 millions FCFA** de bénéfice net annuel
- **~17.2 millions FCFA** de bénéfice net mensuel
- Un **ROI de 985%** sur l'investissement initial

Le modèle est **hautement rentable** et **scalable**, avec une marge bénéficiaire exceptionnelle de 91%.

---

*Document généré le 25 décembre 2025*
*Basé sur 500 restaurants + 50 hôtels*
