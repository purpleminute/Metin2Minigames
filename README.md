# Metin2 Minigame Oracle

A static, browser-only decision assistant for five Metin2 event minigames:

- Okey Card Game
- Catch the King
- Yutnori
- Duel of the Seers
- Fish Puzzle

The complete interface, advice text, and rule notes are available in English, German, and Turkish.

No backend, account, analytics, or external runtime dependency is required. Game state is saved in `localStorage`; the service worker makes the app available offline after the first visit.

## Run locally

```bash
npm test
npm run serve
```

Open <http://localhost:4173>.

## Deploy to GitHub Pages

The included workflow tests and publishes the repository root on pushes to `work` or `main`. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.

The app also works if the repository root is published directly as static files. There is no build step.

## Accuracy model

The app exhaustively checks deterministic legal moves. Okey evaluates every legal current action through deterministic full-deck Monte Carlo playouts. Duel of the Seers maintains an exact Bayesian posterior under a uniformly random opponent policy and uses two-round lookahead. Catch the King uses constrained posterior sampling because of hidden board information. Yutnori evaluates the legal piece and stack moves, exact shortcuts and weighted next-throw exposure. Fish Puzzle evaluates every fixed-orientation placement using a depth-2 expected-draw search.

The UI calls out this boundary: hidden randomness cannot be converted into a guaranteed win by any browser tool.

## Sources

Rules and scoring are based on the linked official German Metin2 Wiki pages in the app. The Fish Puzzle shape model was cross-checked against Agustín Nuñez's MIT-licensed `fishing-jigsaw` solver. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
