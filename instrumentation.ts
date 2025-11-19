import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

/**
 * Langfuse Observability Integration
 * Documentation: https://langfuse.com/docs/integrations/vercel-ai-sdk
 * 
 * Next.js Instrumentation: https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry
 */

export function register() {
  // Register OpenTelemetry with Langfuse exporter
  // Credentials are read from environment variables:
  // - LANGFUSE_SECRET_KEY
  // - LANGFUSE_PUBLIC_KEY
  // - LANGFUSE_BASEURL (optional, defaults to https://cloud.langfuse.com)
  registerOTel({
    serviceName: "tsp-ai",
    traceExporter: new LangfuseExporter({
      debug: true, // Enable debug logging to troubleshoot issues
    }),
  });

  console.log("\n" + "=".repeat(80));
  console.log("🚀 TSP-AI - Démarrage de l'Application");
  console.log("=".repeat(80));

  console.log("\n📊 Configuration Langfuse:");
  const isConfigured = !!(
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_PUBLIC_KEY
  );
  
  console.log(`   - Configuré: ${isConfigured ? "✅ Oui" : "❌ Non"}`);
  console.log(`   - Base URL: ${process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com"}`);
  console.log(`   - Environnement: ${process.env.NODE_ENV || "development"}`);

  if (!isConfigured) {
    console.warn(
      "\n⚠️  LANGFUSE N'EST PAS CONFIGURÉ - Les traces ne seront pas envoyées"
    );
    console.warn("   Variables manquantes:", !process.env.LANGFUSE_SECRET_KEY ? "LANGFUSE_SECRET_KEY" : "LANGFUSE_PUBLIC_KEY");
    console.warn("\n   Pour configurer Langfuse:");
    console.warn("   1. Allez sur: https://cloud.langfuse.com");
    console.warn("   2. Créez un projet et copiez vos clés");
    console.warn("   3. Ajoutez dans .env.local:");
    console.warn("      LANGFUSE_SECRET_KEY=sk-lf-...");
    console.warn("      LANGFUSE_PUBLIC_KEY=pk-lf-...");
    console.warn("      LANGFUSE_BASEURL=https://cloud.langfuse.com");
  } else {
    console.log(
      "\n✅ LANGFUSE EST CONFIGURÉ - Les traces seront envoyées à Langfuse Cloud"
    );
  }

  console.log("=".repeat(80) + "\n");
}
