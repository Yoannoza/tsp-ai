import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page non trouvée</h1>
      <p className="text-muted-foreground mb-8">
        La page de documentation que vous cherchez n'existe pas.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/docs">Documentation</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}
