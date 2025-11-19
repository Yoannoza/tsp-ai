"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Analytics = {
  totalQueries: number;
  avgExecutionTime: number;
  avgSimilarity: number;
  noResultRate: number;
  topQueries: Array<{ query: string; count: number }>;
  topDocuments: Array<{
    documentId: string;
    citationCount: number;
    avgSimilarity: number;
  }>;
};

export function AnalyticsDashboard({
  analytics,
  documents,
}: {
  analytics: Analytics;
  documents: Array<{ id: string; filename: string }>;
}) {
  const getDocumentName = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    return doc?.filename || "Document inconnu";
  };

  return (
    <div className="space-y-6">
      {/* Métriques clés */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Requêtes Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{analytics.totalQueries}</div>
            <p className="text-muted-foreground text-xs">Derniers 30 jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Temps Moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {analytics.avgExecutionTime}ms
            </div>
            <p className="text-muted-foreground text-xs">Recherche vectorielle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Similarité Moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {(analytics.avgSimilarity * 100).toFixed(0)}%
            </div>
            <p className="text-muted-foreground text-xs">Pertinence des résultats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Taux Sans Résultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {analytics.noResultRate.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">Gaps à combler</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Requêtes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Requêtes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topQueries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune donnée disponible
              </p>
            ) : (
              analytics.topQueries.map((query, index) => (
                <div
                  className="flex items-center justify-between rounded-md border p-3"
                  key={index}
                >
                  <p className="flex-1 truncate text-sm">{query.query}</p>
                  <Badge variant="secondary">{query.count}x</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents les Plus Cités */}
      <Card>
        <CardHeader>
          <CardTitle>Documents les Plus Cités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topDocuments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune donnée disponible
              </p>
            ) : (
              analytics.topDocuments.map((doc, index) => (
                <div
                  className="flex items-center justify-between rounded-md border p-3"
                  key={index}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getDocumentName(doc.documentId)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Similarité moy: {(doc.avgSimilarity * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Badge variant="secondary">{doc.citationCount} citations</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
