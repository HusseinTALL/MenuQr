# Estimation des Coûts de Production - MenuQR

## Hypothèses de Base

- **500 restaurants** inscrits
- **50 hôtels** inscrits
- Taux de change: 1 USD = 600 FCFA / 1 EUR = 656 FCFA
- Trafic estimé: ~100 000 visiteurs/mois
- Commandes estimées: ~50 000/mois
- Réservations estimées: ~10 000/mois

---

## 1. Hébergement Backend (API Node.js)

| Service | Option | Coût USD/mois | Coût FCFA/mois |
|---------|--------|---------------|----------------|
| **DigitalOcean** | Droplet 4GB RAM, 2 vCPU | $24 | 14 400 |
| **Railway** | Pro Plan | $20 | 12 000 |
| **Render** | Standard (2GB RAM) | $25 | 15 000 |
| **AWS EC2** | t3.medium | $30 | 18 000 |

**Recommandé**: DigitalOcean ou Railway = **~15 000 FCFA/mois**

---

## 2. Base de Données (MongoDB)

| Service | Option | Coût USD/mois | Coût FCFA/mois |
|---------|--------|---------------|----------------|
| **MongoDB Atlas** | M10 Cluster (2GB RAM, 10GB stockage) | $57 | 34 200 |
| **MongoDB Atlas** | M20 Cluster (4GB RAM, 20GB stockage) | $140 | 84 000 |
| **DigitalOcean Managed MongoDB** | 2GB RAM | $60 | 36 000 |

**Recommandé**: MongoDB Atlas M10 = **~35 000 FCFA/mois**

---

## 3. Hébergement Frontend (Vue.js - Statique)

| Service | Option | Coût USD/mois | Coût FCFA/mois |
|---------|--------|---------------|----------------|
| **Vercel** | Pro Plan | $20 | 12 000 |
| **Netlify** | Pro Plan | $19 | 11 400 |
| **Cloudflare Pages** | Free/Pro | $0-20 | 0-12 000 |

**Recommandé**: Cloudflare Pages (gratuit avec CDN) = **~0 FCFA/mois**

---

## 4. Service SMS (Critique pour l'application)

### Estimations de volume mensuel:
- OTP (inscription/connexion): ~2 000 SMS
- Confirmations de commande: ~50 000 SMS
- Confirmations de réservation: ~10 000 SMS
- Rappels de réservation: ~20 000 SMS
- Campagnes marketing: ~5 000 SMS
- **Total**: ~87 000 SMS/mois

| Service | Prix/SMS (Afrique) | Coût mensuel FCFA |
|---------|-------------------|-------------------|
| **Twilio** | 0.05 USD (~30 FCFA) | 2 610 000 |
| **Orange SMS API** | 15-25 FCFA | 1 305 000 - 2 175 000 |
| **Infobip** | 0.03-0.05 USD | 1 566 000 - 2 610 000 |
| **Africa's Talking** | 0.02-0.03 USD | 1 044 000 - 1 566 000 |

**Recommandé**: Orange SMS API ou Africa's Talking = **~1 500 000 FCFA/mois**

> **Note importante**: Le coût SMS représente la majeure partie des dépenses. Il est possible de réduire en:
> - Utilisant WhatsApp Business API (moins cher)
> - Rendant les SMS de confirmation optionnels
> - Limitant les rappels

---

## 5. Stockage Fichiers (Images)

### Volume estimé:
- ~5 000 images de plats (5MB moy.) = 25 GB
- ~550 logos restaurants/hôtels = 0.5 GB
- Bande passante: ~100 GB/mois

| Service | Option | Coût USD/mois | Coût FCFA/mois |
|---------|--------|---------------|----------------|
| **Cloudinary** | Plus Plan (25GB + transforms) | $89 | 53 400 |
| **AWS S3 + CloudFront** | Pay-as-you-go | ~$15 | ~9 000 |
| **DigitalOcean Spaces** | 250GB + CDN | $5 | 3 000 |
| **Cloudflare R2** | 10GB gratuit, puis $0.015/GB | ~$5 | ~3 000 |

**Recommandé**: DigitalOcean Spaces ou Cloudflare R2 = **~5 000 FCFA/mois**

---

## 6. Domaine et SSL

| Élément | Coût annuel USD | Coût annuel FCFA |
|---------|-----------------|------------------|
| Domaine .com/.fr | $12-15 | 7 200 - 9 000 |
| Domaine .sn (Sénégal) | $50 | 30 000 |
| SSL (Let's Encrypt) | Gratuit | 0 |

**Coût annuel domaine**: ~10 000 FCFA = **~850 FCFA/mois**

---

## 7. Services Additionnels

| Service | Usage | Coût USD/mois | Coût FCFA/mois |
|---------|-------|---------------|----------------|
| **Email transactionnel** (SendGrid) | 50 000 emails | $15 | 9 000 |
| **Monitoring** (UptimeRobot) | 50 moniteurs | $0 (gratuit) | 0 |
| **Logs** (Papertrail) | 1GB/mois | $7 | 4 200 |
| **Analytics** (Mixpanel) | 100K events | $0 (gratuit) | 0 |

**Total services additionnels**: **~15 000 FCFA/mois**

---

## 8. Backup et Sécurité

| Service | Description | Coût FCFA/mois |
|---------|-------------|----------------|
| Backup MongoDB | Inclus dans Atlas | 0 |
| Backup fichiers | DigitalOcean Snapshots | 3 000 |
| WAF/DDoS Protection | Cloudflare (gratuit) | 0 |

**Total backup/sécurité**: **~3 000 FCFA/mois**

---

## Récapitulatif des Coûts Mensuels

| Catégorie | Coût FCFA/mois | % du total |
|-----------|----------------|------------|
| Backend (API) | 15 000 | 0.9% |
| Base de données | 35 000 | 2.1% |
| Frontend | 0 | 0% |
| **SMS** | **1 500 000** | **90.7%** |
| Stockage fichiers | 5 000 | 0.3% |
| Domaine | 850 | 0.05% |
| Services additionnels | 15 000 | 0.9% |
| Backup/Sécurité | 3 000 | 0.2% |
| **Marge imprévus (10%)** | 157 385 | 9.5% |
| **TOTAL MENSUEL** | **1 731 235 FCFA** | 100% |

---

## Coûts Annuels

| Période | Coût FCFA |
|---------|-----------|
| Mensuel | 1 731 235 |
| Annuel | **20 774 820 FCFA** |

---

## Scénarios Alternatifs

### Scénario A: Réduction des SMS (WhatsApp + SMS limités)

En utilisant WhatsApp Business API + SMS uniquement pour OTP:
- WhatsApp: 0.03-0.05 USD/message = ~2 610 000 FCFA pour 87 000 messages
- Mais avec optimisation: seulement OTP par SMS = 2 000 SMS × 25 FCFA = **50 000 FCFA**
- Reste via WhatsApp (gratuit dans les 24h de conversation initiée par l'utilisateur)

| Catégorie | Coût FCFA/mois |
|-----------|----------------|
| Tous services (sans SMS massifs) | 73 850 |
| SMS OTP uniquement | 50 000 |
| **TOTAL avec optimisation** | **~125 000 FCFA/mois** |
| **TOTAL annuel optimisé** | **~1 500 000 FCFA** |

### Scénario B: Infrastructure minimale (démarrage)

Pour démarrer avec moins de clients:

| Catégorie | Coût FCFA/mois |
|-----------|----------------|
| Backend (Railway free tier) | 0 |
| MongoDB Atlas (M0 gratuit 512MB) | 0 |
| Cloudflare Pages | 0 |
| SMS (volume réduit ~5000) | 125 000 |
| Stockage (Cloudflare R2 free tier) | 0 |
| **TOTAL minimal** | **~125 000 FCFA/mois** |

---

## Recommandations

### 1. Optimisation SMS (Priorité haute)
Le coût SMS représente **90%** des dépenses. Solutions:
- Intégrer WhatsApp Business API pour notifications
- Rendre les SMS de rappel optionnels (opt-in)
- Utiliser les notifications push web (PWA)
- Négocier des tarifs de volume avec les opérateurs locaux

### 2. Modèle de revenus suggéré

Pour couvrir les coûts (~1 700 000 FCFA/mois):

| Abonnement | Nombre | Prix/mois | Revenu mensuel |
|------------|--------|-----------|----------------|
| Restaurant Essentiel | 200 | 20 000 FCFA | 4 000 000 |
| Restaurant Confort | 200 | 35 000 FCFA | 7 000 000 |
| Restaurant Premium | 100 | 60 000 FCFA | 6 000 000 |
| Hôtel Essentiel | 20 | 20 000 FCFA | 400 000 |
| Hôtel Confort | 20 | 35 000 FCFA | 700 000 |
| Hôtel Premium | 10 | 60 000 FCFA | 600 000 |
| **TOTAL REVENUS** | **550** | - | **18 700 000 FCFA** |

**Marge bénéficiaire**: 18 700 000 - 1 731 235 = **~17 000 000 FCFA/mois** (~90% de marge)

### 3. Stratégie de scaling

| Utilisateurs | Infrastructure recommandée | Coût estimé |
|--------------|---------------------------|-------------|
| 0-100 | Tier gratuit (MongoDB M0, Railway free) | ~50 000 FCFA |
| 100-500 | Infrastructure de base | ~200 000 FCFA |
| 500-1000 | Infrastructure moyenne | ~500 000 FCFA |
| 1000+ | Infrastructure complète | ~1 500 000+ FCFA |

---

## Conclusion

### Coût mensuel estimé (550 établissements)

| Scénario | Coût mensuel FCFA | Coût annuel FCFA |
|----------|-------------------|------------------|
| **Complet (SMS inclus)** | 1 731 235 | 20 774 820 |
| **Optimisé (WhatsApp + SMS OTP)** | 125 000 | 1 500 000 |
| **Minimal (démarrage)** | 125 000 | 1 500 000 |

> **Recommandation finale**: Commencer avec le scénario optimisé (~125 000 FCFA/mois) en utilisant WhatsApp pour les notifications et SMS uniquement pour les OTP. Cela permet de valider le modèle commercial avant d'investir dans une infrastructure SMS complète.

---

*Document généré le 25 décembre 2025*
*Taux de change: 1 USD = 600 FCFA*
