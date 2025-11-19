import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getAllKnowledgeBase } from "@/lib/actions/knowledge-base";
import { KnowledgeBaseClient } from "./components/knowledge-base-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function KnowledgeBasePage() {
  const session = await auth();

  if (!session?.user || session.user.type !== "regular") {
    redirect("/");
  }

  const result = await getAllKnowledgeBase();

  if (!result.success) {
    redirect("/");
  }

  const { documents } = result;

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Base de Connaissances</h1>
        <p className="text-muted-foreground">
          Gérez les documents utilisés par l'assistant IA pour répondre aux
          questions.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">Documents totaux</p>
              <p className="font-bold text-2xl">{documents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Taille totale</p>
              <p className="font-bold text-2xl">
                {(
                  documents.reduce(
                    (acc, doc) => acc + (doc.content?.length || 0),
                    0
                  ) / 1024
                ).toFixed(2)}{" "}
                KB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <KnowledgeBaseClient documents={documents} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">
                Documents totaux
              </p>
              <p className="font-bold text-2xl">{documents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                Taille totale
              </p>
              <p className="font-bold text-2xl">
                {(
                  documents.reduce(
                    (acc, doc) => acc + (doc.content?.length || 0),
                    0
                  ) / 1024
                ).toFixed(2)}{" "}
                KB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h2 className="mb-4 font-semibold text-xl">Documents</h2>
        <KnowledgeBaseClient documents={documents} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Initialisation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground text-sm">
            Pour initialiser la base de connaissances avec les documents du
            dossier Documentation/, exécutez la commande suivante:
          </p>
          <code className="block rounded-md bg-muted p-4 text-sm">
            pnpm tsx scripts/init-knowledge-base.ts
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
