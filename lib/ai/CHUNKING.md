# Système de Chunking Intelligent - Documentation

## Vue d'ensemble

Le nouveau système de chunking remplace l'approche simpliste de découpage par 500 mots avec une **segmentation intelligente basée sur la structure sémantique** des documents.

## Problème avec l'ancien système

L'ancien système divisait les documents de manière arbitraire :
- ✗ Découpage par phrases (`.!?`)
- ✗ Limite fixe de 500 caractères
- ✗ Aucune prise en compte de la structure documentaire
- ✗ Perte du contexte sémantique
- ✗ Impossible de filtrer par type de contenu

**Exemple :** Un article de loi pouvait être coupé en plein milieu, rendant l'information incompréhensible.

## Nouveau système - Chunking structuré

### Principes clés

Le nouveau système utilise la **structure intrinsèque** des documents :

1. **Détection automatique du type de document**
2. **Chunking adapté** selon le type
3. **Métadonnées riches** pour filtrage intelligent
4. **Extraction automatique** des entités et concepts

### Types de documents supportés

#### 1. Documents légaux (Code, Loi, Décret)

**Chunking** : Par article
**Métadonnées** :
- `article` : Numéro de l'article (ex: "406")
- `chapitre` : Chapitre parent (ex: "II: Intelligence Artificielle")
- `entites` : Organisations mentionnées (ASIN, ARCEP, etc.)
- `concepts` : Concepts techniques (IA, Cybersécurité, etc.)

**Exemple** :
```typescript
{
  content: "Article 406: Toute solution d'intelligence artificielle...",
  metadata: {
    documentType: "code_numerique",
    article: "406",
    chapitre: "II: Intelligence Artificielle",
    concepts: ["IA"],
    entites: []
  }
}
```

#### 2. Guides et rapports de maturité

**Chunking** : Par section et bonne pratique
**Métadonnées** :
- `section` : Titre de la section
- `axe` : Axe de maturité (Stratégie, RH, Finance, etc.)
- `niveau` : Niveau de maturité (Basique, Avancé, etc.)
- `concepts` : KPI, B2G, Due Diligence, etc.

**Exemple** :
```typescript
{
  content: "- Mettre en place un processus de recrutement structuré...",
  metadata: {
    documentType: "guide_bonnes_pratiques",
    axe: "ressources_humaines",
    section: "Bonnes Pratiques pour le Recrutement",
    concepts: []
  }
}
```

#### 3. Stratégies nationales

**Chunking** : Par action (Action 1.2, Action 4.3, etc.)
**Métadonnées** :
- `section` : Numéro de l'action
- `entites` : ESN, Startups, Ministères, etc.
- `concepts` : IA, Mégadonnées, Cybersécurité, etc.

#### 4. Guide de l'entrepreneur

**Chunking** : Par phase (Idéation, Pré-amorçage, Croissance, etc.)
**Métadonnées** :
- `section` : Phase du cycle entrepreneurial
- `concepts` : Design Thinking, MVP, Due Diligence, etc.

## Axes de maturité organisationnelle

Le système reconnaît automatiquement les **5 axes de maturité** des ESN :

1. **Stratégie** (`strategie`)
2. **Vente & Marketing** (`vente_marketing`)
3. **Exécution des Projets** (`execution_projets`)
4. **Ressources Humaines** (`ressources_humaines`)
5. **Finance & Comptabilité** (`finance_comptabilite`)

## Entités détectées

Le système extrait automatiquement les **acteurs clés** :
- ESN (Entreprises de Services du Numérique)
- Startups
- ASIN (Agence des Systèmes d'Information et du Numérique)
- ARCEP (Autorité de Régulation)
- Ministères

## Concepts techniques détectés

Le système identifie les **concepts importants** :
- Intelligence Artificielle (IA)
- Cybersécurité
- Due Diligence
- Data Room
- Design Thinking
- Méthodologies Agiles (Scrum, Kanban)
- KPI (Key Performance Indicators)
- Mégadonnées (Big Data)
- B2G (Business to Government)

## Recherche intelligente avec filtres

### Filtrage par type de document

```typescript
// Rechercher uniquement dans les textes légaux
const results = await findRelevantContent(
  "règles sur l'IA",
  15,
  0.3,
  { documentType: DocumentType.CODE_NUMERIQUE }
);
```

### Filtrage par axe de maturité

```typescript
// Rechercher uniquement dans l'axe RH
const results = await findRelevantContent(
  "recrutement",
  15,
  0.3,
  { axe: AxeMaturite.RESSOURCES_HUMAINES }
);
```

### Filtrage par concepts

```typescript
// Rechercher documents parlant d'IA et de cybersécurité
const results = await findRelevantContent(
  "sécurité des systèmes intelligents",
  15,
  0.3,
  { concepts: ["IA", "Cybersécurité"] }
);
```

### Filtrage multi-critères

```typescript
// Recherche avancée : Guides ESN sur l'axe Stratégie mentionnant le B2G
const results = await findRelevantContent(
  "positionnement marché public",
  15,
  0.3,
  {
    documentType: DocumentType.GUIDE_BONNES_PRATIQUES,
    axe: AxeMaturite.STRATEGIE,
    concepts: ["B2G"],
    entites: ["ESN"]
  }
);
```

## Avantages du nouveau système

### ✅ Précision sémantique

Les chunks respectent la structure logique du document :
- Articles de loi complets
- Bonnes pratiques individuelles
- Actions stratégiques isolées

### ✅ Contexte enrichi

Chaque chunk contient des métadonnées permettant de :
- Savoir d'où vient l'information (type de doc, section, article)
- Identifier le domaine (axe de maturité)
- Filtrer par acteur ou concept

### ✅ Recherche ciblée

L'utilisateur peut poser des questions spécifiques :
- "Quelles sont les lois sur l'IA ?" → Filtre sur `documentType: CODE_NUMERIQUE` + `concepts: ["IA"]`
- "Bonnes pratiques RH pour ESN" → Filtre sur `axe: RESSOURCES_HUMAINES` + `entites: ["ESN"]`

### ✅ Meilleure qualité de réponses

Le RAG peut maintenant :
- Citer des articles de loi précis
- Référencer des bonnes pratiques spécifiques
- Fournir le contexte complet (chapitre, section, axe)

## Comparaison avant/après

### Ancien système
```
Document de 2000 mots → 4 chunks de 500 mots
❌ Chunk 1 : "...Article 406: Toute solution d'intelligence..."
❌ Chunk 2 : "...artificielle déployée dans le secteur public..."
```
→ Contexte perdu, information fragmentée

### Nouveau système
```
Document de 2000 mots → 5 chunks structurés
✅ Chunk 1 : Article 406 complet avec métadonnées
✅ Chunk 2 : Article 407 complet avec métadonnées
```
→ Contexte préservé, information complète

## Migration

### Schéma de base de données

Ajout de la colonne `metadata` :

```sql
ALTER TABLE "Embeddings" ADD COLUMN "metadata" jsonb;
```

### Code de migration

```bash
pnpm drizzle-kit generate
pnpm db:migrate
```

## Tests

Lancer les tests du système :

```bash
npx tsx lib/ai/test-chunking.ts
```

## Prochaines améliorations

- [ ] Support des tableaux et graphiques
- [ ] Détection des annexes et glossaires
- [ ] Chunking multi-niveaux (section → sous-section → paragraphe)
 - [ ] Export des métadonnées pour observabilité
 - [ ] Intégration avec le système d'expérimentation

## Références

- Analyse complète du chunking : Voir le fichier source de l'analyse fournie
- Documentation Experiments : `/datasets/experiments/README.md`
