# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation "Liens d'accès rapide" [ref=e4]:
    - link "Aller au contenu principal" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - link "Aller à la navigation" [ref=e6] [cursor=pointer]:
      - /url: "#main-nav"
  - main [ref=e7]:
    - generic [ref=e8]:
      - banner [ref=e9]:
        - navigation "Navigation principale" [ref=e10]:
          - generic [ref=e11]:
            - button "Retour" [ref=e12]:
              - img [ref=e13]
            - heading "Votre commande" [level=1] [ref=e15]
          - group "Actions" [ref=e16]:
            - button "🇫🇷 FR" [ref=e17]:
              - generic [ref=e18]:
                - generic [ref=e19]: 🇫🇷
                - generic [ref=e20]: FR
      - generic [ref=e22]:
        - img [ref=e25]
        - heading "Votre panier est vide" [level=3] [ref=e28]
        - paragraph [ref=e29]: Ajoutez des plats depuis le menu pour commencer
        - button "Parcourir le menu" [ref=e30]
  - generic [ref=e33]:
    - generic [ref=e34]:
      - img [ref=e36]
      - generic [ref=e38]:
        - heading "Prêt pour le mode hors ligne" [level=3] [ref=e39]
        - paragraph [ref=e40]: L'application est maintenant disponible hors ligne. Vous pouvez consulter le menu même sans connexion internet.
      - button [ref=e41]:
        - img [ref=e42]
    - button "Compris" [ref=e45]
```