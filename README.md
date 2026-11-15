# Professeur de musique

Application web pédagogique pour réviser les bases de la théorie musicale dans un cadre simple et accessible.

## Fonctionnalités

- leçons thématiques regroupées par chapitre
- questions à choix multiples sur notes, intervalles, tonalités, rythme et harmonies
- exemples musicaux en SVG adaptés au cours sélectionné
- synthèse sonore simple via Web Audio API
- interface responsive en français

## Démarrage

```bash
npm start
```

Puis ouvrir : http://localhost:3000

## Tests

```bash
npm test
```

## Structure

- `server.js` : serveur HTTP statique
- `course.js` : catalogue des leçons
- `app.js` : logique de l’interface
- `index.html` : structure HTML
- `styles.css` : mise en page
- `test/server.test.js` : vérifications de base
