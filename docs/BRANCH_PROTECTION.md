# Branch Protection Configuration

Ce document décrit la configuration de protection des branches pour le projet MenuQR.

## Branches Protégées

### `main` (Production)

La branche `main` contient le code de production. Elle doit être strictement protégée.

### `develop` (Développement)

La branche `develop` est la branche d'intégration pour les nouvelles fonctionnalités.

---

## Configuration GitHub (Settings → Branches)

### Pour la branche `main`

Accédez à **Repository Settings → Branches → Add branch protection rule**

#### Paramètres à activer :

```
Branch name pattern: main
```

**Protect matching branches:**

- [x] **Require a pull request before merging**
  - [x] Require approvals: `1` (minimum)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
  - [x] Require approval of the most recent reviewable push

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Required status checks:
    - `CI Success`
    - `Frontend - Lint`
    - `Frontend - Type Check`
    - `Frontend - Build`
    - `Frontend - Test`
    - `Backend - Lint`
    - `Backend - Type Check`
    - `Backend - Build`
    - `Backend - Test`

- [x] **Require conversation resolution before merging**

- [x] **Require signed commits** (optional, recommandé)

- [x] **Require linear history**
  - Force les PRs à être squash ou rebase

- [x] **Do not allow bypassing the above settings**

- [ ] **Allow force pushes** - DÉSACTIVÉ
  - Ne jamais autoriser les force pushes sur main

- [ ] **Allow deletions** - DÉSACTIVÉ
  - Empêche la suppression de la branche

---

### Pour la branche `develop`

```
Branch name pattern: develop
```

**Paramètres (moins stricts que main):**

- [x] **Require a pull request before merging**
  - [x] Require approvals: `1`
  - [x] Dismiss stale pull request approvals when new commits are pushed

- [x] **Require status checks to pass before merging**
  - Required status checks:
    - `CI Success`

- [x] **Require conversation resolution before merging**

- [ ] **Allow force pushes** - DÉSACTIVÉ

---

## Commandes CLI (GitHub CLI)

Si vous préférez utiliser la CLI GitHub :

```bash
# Installer GitHub CLI si nécessaire
brew install gh

# Se connecter
gh auth login

# Configurer la protection pour main
gh api repos/{owner}/{repo}/branches/main/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["CI Success"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

---

## Workflow de Développement Recommandé

### 1. Créer une branche feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-feature
```

### 2. Développer et committer

```bash
git add .
git commit -m "feat: description de la fonctionnalité"
```

### 3. Pousser et créer une PR

```bash
git push -u origin feature/nom-de-la-feature
gh pr create --base develop --title "feat: description" --body "..."
```

### 4. Après review et merge dans develop

```bash
git checkout develop
git pull origin develop
git branch -d feature/nom-de-la-feature
```

### 5. Release vers main

```bash
# Créer une PR de develop vers main
gh pr create --base main --head develop --title "Release v1.x.x"
```

---

## Conventions de Nommage des Branches

| Préfixe | Usage | Exemple |
|---------|-------|---------|
| `feature/` | Nouvelles fonctionnalités | `feature/order-tracking` |
| `fix/` | Corrections de bugs | `fix/login-redirect` |
| `hotfix/` | Corrections urgentes (prod) | `hotfix/payment-crash` |
| `refactor/` | Refactoring de code | `refactor/api-structure` |
| `docs/` | Documentation | `docs/api-endpoints` |
| `chore/` | Maintenance | `chore/update-deps` |

---

## Checklist de Configuration

- [ ] Protection activée sur `main`
- [ ] Protection activée sur `develop`
- [ ] Status checks CI configurés
- [ ] CODEOWNERS configuré
- [ ] Signed commits (optionnel)
- [ ] Force push désactivé
- [ ] Suppression de branche désactivée
- [ ] Équipes assignées pour review

---

## Troubleshooting

### "Required status check is not satisfied"

Vérifiez que :
1. Le workflow CI s'est exécuté correctement
2. Tous les jobs ont passé
3. Les noms des status checks correspondent exactement

### "Review required"

1. Demandez une review à un membre de l'équipe
2. Vérifiez le fichier CODEOWNERS pour les reviewers automatiques

### "Merge blocked by branch protection"

1. Résolvez tous les commentaires de review
2. Attendez que tous les checks passent
3. Mettez à jour la branche avec la cible (rebase ou merge)
