# Evaluation System - LLM as Judge

Système d'évaluation personnalisé utilisant Gemini comme juge LLM pour évaluer la qualité des réponses générées.

## 🎯 Metrics Évaluées

### 1. **Correctness** (0-1)
Évalue si la génération inclut tous les faits clés de la vérité de terrain et si chaque fait est factuellement supporté.

### 2. **Context Precision** (0-1)
Vérifie si le contexte fourni était utile pour arriver à la réponse donnée.

### 3. **Answer Relevance** (0-1)
Génère une question pour la réponse donnée et identifie si la réponse est évasive ou engagée.

### 4. **Faithfulness** (0-1)
Analyse la complexité de chaque phrase et décompose la réponse en déclarations vérifiables.

## 🚀 Utilisation

### Via l'interface Web

1. Démarrer le serveur de développement :
```bash
pnpm dev
```

2. Accéder au dashboard :
```
http://localhost:3000/evaluation
```

3. Utiliser l'interface pour :
   - Lancer de nouvelles évaluations
   - Visualiser les résultats avec graphiques
   - Consulter l'historique
   - Exporter en JSON/CSV

### Via le CLI

```bash
# Évaluation basique
pnpm eval

# Avec options
pnpm eval --dataset esn_qa_dataset --max-samples 10

# Spécifier le modèle
pnpm eval --model gemini-1.5-pro

# Spécifier l'output
pnpm eval --output ./my-results.json
```

## 📁 Structure

```
lib/evaluation/
├── types.ts                  # Types TypeScript
├── evaluator.ts              # Orchestrateur principal
├── prompts/
│   └── templates.ts          # Templates de prompts
├── judges/
│   └── gemini-judge.ts       # Gemini LLM as Judge
└── metrics/
    ├── correctness.ts
    ├── context-precision.ts
    ├── answer-relevance.ts
    └── faithfulness.ts

components/evaluation/
├── dashboard.tsx             # Dashboard principal
├── metrics-chart.tsx         # Graphiques
├── results-table.tsx         # Table détaillée
└── evaluation-runner.tsx     # Interface de lancement

app/
├── (evaluation)/evaluation/  # Page Next.js
└── api/evaluation/
    ├── run/route.ts          # POST - Lancer évaluation
    ├── results/route.ts      # GET - Récupérer résultats
    └── export/route.ts       # GET - Exporter
```

## ⚙️ Configuration

### Variables d'environnement

Ajouter dans `.env.local` :

```bash
# Gemini API Key (requis)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Format du Dataset CSV

Le dataset doit contenir les colonnes suivantes :

```csv
id,query,generation,ground_truth,context,answer
sample_1,"Question?","Generated answer","Expected answer","Context text","Answer text"
```

**Colonnes requises :**
- `id` - Identifiant unique
- `query` - Question posée
- `generation` - Réponse générée
- `ground_truth` - Réponse attendue

**Colonnes optionnelles :**
- `context` - Contexte fourni (pour Context Precision)
- `answer` - Réponse alternative (pour Answer Relevance)

## 📊 Exemples de Résultats

### Dashboard Web
![Dashboard](docs/evaluation-dashboard.png)

### Export JSON
```json
{
  "evaluation_id": "abc123",
  "dataset_name": "esn_qa_dataset",
  "total_samples": 100,
  "metrics": {
    "correctness": {
      "average": 0.78,
      "min": 0.1,
      "max": 1.0,
      "distribution": {
        "0.8-1.0": 45,
        "0.6-0.8": 30,
        ...
      }
    }
  }
}
```

### Export CSV
```csv
sample_id,query,generation,correctness_score,correctness_reasoning,...
sample_1,"Question?","Answer",0.85,"The generation correctly...",...
```

## 🔧 API Endpoints

### POST /api/evaluation/run
Lancer une nouvelle évaluation

```typescript
{
  dataset_name: 'esn_qa_dataset',
  model_name: 'gemini-2.5-flash-lite',
  max_samples: 10,
  metrics: ['correctness', 'faithfulness'],
  save_results: true
}
```

### GET /api/evaluation/results
Lister toutes les évaluations

### GET /api/evaluation/results?id=xxx
Récupérer une évaluation spécifique

### GET /api/evaluation/export?id=xxx&format=csv
Exporter les résultats

## 💡 Tips

### Optimiser les coûts
- Utiliser `gemini-2.5-flash-lite` (gratuit/très économique)
- Limiter avec `--max-samples` pour les tests
- Sélectionner uniquement les metrics nécessaires

### Améliorer la précision
- Utiliser `gemini-1.5-pro` pour plus de précision
- Fournir des ground truth détaillées
- Inclure du contexte pertinent

### Performance
- Le système évalue ~2-3 samples/seconde
- Utilise retry automatique en cas d'erreur
- Gère le rate limiting de Gemini

## 📈 Roadmap

- [ ] Support de modèles Judge supplémentaires (Claude, GPT-4)
- [ ] Metrics custom définissables via UI
- [ ] Comparaison multi-modèles
- [ ] Streaming des résultats en temps réel
- [ ] Intégration Langfuse pour tracing

## 🐛 Troubleshooting

### "GOOGLE_GENERATIVE_AI_API_KEY is required"
Ajouter la clé API dans `.env.local`

### "Failed to parse CSV"
Vérifier que le CSV a les colonnes requises

### Rate limit errors
Utiliser `--max-samples` pour limiter ou attendre quelques minutes

## 📝 License

MIT
