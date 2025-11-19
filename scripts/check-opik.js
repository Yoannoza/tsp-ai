#!/usr/bin/env node

/**
 * Script de vérification de la configuration Opik
 * Usage: node scripts/check-opik.js
 */

const requiredVars = [
  "OPIK_API_KEY",
  "OPIK_URL_OVERRIDE",
  "OPIK_PROJECT_NAME",
  "OPIK_WORKSPACE",
];

console.log("🔍 Vérification de la configuration Opik...\n");

let allConfigured = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const status = value ? "✅" : "❌";
  const display = value ? `${value.substring(0, 20)}${value.length > 20 ? "..." : ""}` : "Non configurée";
  
  console.log(`${status} ${varName}: ${display}`);
  
  if (!value) {
    allConfigured = false;
  }
});

console.log(`\n${process.env.OPIK_LOG_LEVEL ? "✅" : "⚠️ "} OPIK_LOG_LEVEL: ${process.env.OPIK_LOG_LEVEL || "Non défini (INFO par défaut)"}`);

console.log("\n" + "=".repeat(50));

if (allConfigured) {
  console.log("\n✅ Configuration Opik complète !");
  console.log("   Les traces seront envoyées vers Opik.");
  console.log(`   Dashboard: https://www.comet.com/${process.env.OPIK_WORKSPACE}/${process.env.OPIK_PROJECT_NAME}`);
} else {
  console.log("\n❌ Configuration Opik incomplète !");
  console.log("   Les traces ne seront PAS envoyées.");
  console.log("\n📖 Voir le guide de configuration :");
  console.log("   docs/OPIK_VERCEL_SETUP.md");
  process.exit(1);
}
