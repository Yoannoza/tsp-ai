import { config } from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { eq } from "drizzle-orm";
import { db } from "../lib/db-scripts";
import { knowledgeBase, user } from "../lib/db/schema";

config({ path: ".env.local" });

// Tu peux remplacer cette valeur par ton User ID directement
// Pour le trouver : pnpm db:studio puis regarde dans la table User
const DEFAULT_USER_ID = process.env.INIT_USER_ID || "";

async function getUserId(): Promise<string> {
  // Si un User ID est défini dans l'environnement ou en constante
  if (DEFAULT_USER_ID) {
    console.log(`� Utilisation du User ID: ${DEFAULT_USER_ID}\n`);
    return DEFAULT_USER_ID;
  }

  // Sinon, demander à l'utilisateur
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🔑 Pour initialiser la base de connaissances, j'ai besoin de ton User ID.");
  console.log("💡 Pour le trouver:");
  console.log("   1. Lance 'pnpm db:studio' dans un autre terminal");
  console.log("   2. Va sur http://localhost:4983");
  console.log("   3. Ouvre la table 'User'");
  console.log("   4. Copie ton 'id' (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)\n");

  const userId = await rl.question("Colle ton User ID ici: ");
  rl.close();

  // Valider le format UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId.trim())) {
    console.error(
      "\n❌ Format invalide. Le User ID doit être au format UUID."
    );
    process.exit(1);
  }

  // Vérifier que l'utilisateur existe
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId.trim()));

  if (!existingUser) {
    console.error("\n❌ Aucun utilisateur trouvé avec cet ID.");
    console.log(
      "💡 Assure-toi d'avoir un compte créé. Va sur http://localhost:3000/register\n"
    );
    process.exit(1);
  }

  console.log(`✅ Utilisateur trouvé: ${existingUser.email}\n`);
  return userId.trim();
}

async function initializeKnowledgeBase() {
  console.log("🚀 Initialisation de la base de connaissances...\n");

  // Récupérer le User ID (demande à l'utilisateur ou utilise la variable d'env)
  const userId = await getUserId();

  const docsPath = path.join(process.cwd(), "Documentation");

  // Vérifier que le dossier existe
  if (!fs.existsSync(docsPath)) {
    console.error("❌ Le dossier Documentation n'existe pas");
    process.exit(1);
  }

  // Lire tous les fichiers .md
  const files = fs
    .readdirSync(docsPath)
    .filter((file) => file.endsWith(".md"));

  console.log(`📚 ${files.length} fichiers Markdown trouvés\n`);

  let totalChunks = 0;

  for (const file of files) {
    const filepath = path.join(docsPath, file);
    const content = fs.readFileSync(filepath, "utf-8");

    console.log(`📄 Traitement de: ${file}`);
    console.log(`   Taille: ${(content.length / 1024).toFixed(2)} KB`);

    try {
      // Créer l'entrée dans la base de connaissances
      const [knowledge] = await db
        .insert(knowledgeBase)
        .values({
          filename: file,
          filepath: `Documentation/${file}`,
          content,
          uploadedBy: userId,
        })
        .returning();

      console.log(`   ✅ Document ajouté à la base de connaissances\n`);
    } catch (error) {
      console.error(`   ❌ Erreur: ${error}\n`);
    }
  }

  console.log(`\n🎉 Initialisation terminée!`);
  console.log(`📊 Résumé:`);
  console.log(`   - ${files.length} documents traités`);
  console.log(`   - ${totalChunks} chunks d'embeddings créés`);

  process.exit(0);
}

// Exécuter le script
initializeKnowledgeBase().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});
