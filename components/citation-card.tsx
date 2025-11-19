"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileIcon } from "@/components/icons";

type Citation = {
  content: string;
  similarity: number;
  filename?: string;
};

export function CitationCard({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileIcon size={16} />
          Sources Utilisées
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {citations.map((citation, index) => (
            <div
              className="rounded-md border bg-background p-3 text-sm"
              key={index}
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge className="text-xs" variant="secondary">
                  Pertinence: {citation.similarity}%
                </Badge>
                {citation.filename && (
                  <span className="text-muted-foreground text-xs">
                    {citation.filename}
                  </span>
                )}
              </div> 
              <p className="text-muted-foreground line-clamp-3">
                {citation.content}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
