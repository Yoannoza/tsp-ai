"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import type { VisibilityType } from "./visibility-selector";
import { FileCheck, DollarSign, Mail, Users } from "lucide-react";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

const suggestions = [
  {
    displayText: "Meilleur itinéraire pour 5 villes",
    shortText: "Itinéraire Optimal",
    fullPrompt: "Je veux visiter Cotonou, Porto-Novo, Ouidah, Abomey et Ganvié. Quel est le meilleur itinéraire pour minimiser la distance totale parcourue ?",
    icon: FileCheck,
    gradient: "from-primary to-primary/70",
  },
  {
    displayText: "Circuit touristique complet",
    shortText: "Circuit Complet",
    fullPrompt: "Propose-moi un circuit touristique optimal pour visiter les principales attractions du Bénin : le Parc de la Pendjari, les cités lacustres de Ganvié, le Palais Royal d'Abomey, la Route des Esclaves à Ouidah et les plages de Grand-Popo.",
    icon: Users,
    gradient: "from-secondary to-secondary/70",
  },
  {
    displayText: "Optimiser mon road trip",
    shortText: "Road Trip",
    fullPrompt: "J'ai 7 jours pour faire un road trip au Bénin. Comment optimiser mon parcours pour voir le maximum de sites touristiques en minimisant les temps de trajet ?",
    icon: DollarSign,
    gradient: "from-primary/80 to-secondary",
  },
  {
    displayText: "Calculer distances & temps",
    shortText: "Distances",
    fullPrompt: "Calcule les distances et temps de trajet entre Cotonou, Parakou, Natitingou, Abomey, Porto-Novo et Ouidah. Quelle est la route la plus courte pour tout visiter ?",
    icon: Mail,
    gradient: "from-secondary/80 to-primary/60",
  },
];

function SuggestedActionsComponent({ chatId, sendMessage }: SuggestedActionsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid w-full gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        const isHovered = hoveredIndex === index;

        return (
          <motion.div
            key={suggestion.fullPrompt}
            variants={itemVariants}
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() => setHoveredIndex(null)}
          >
            <motion.button
              onClick={() => {
                window.history.replaceState({}, "", `/chat/${chatId}`);
                sendMessage({
                  role: "user",
                  parts: [{ type: "text", text: suggestion.fullPrompt }],
                });
              }}
              className="relative w-full h-full group text-left"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="relative overflow-hidden rounded-xl bg-card border border-border p-4 shadow-sm hover:shadow-lg transition-shadow duration-300">
                {/* Gradient overlay au hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${suggestion.gradient} opacity-0 transition-opacity duration-300`}
                  animate={{ opacity: isHovered ? 0.05 : 0 }}
                />

                {/* Effet de brillance */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)"
                  }}
                />

                {/* Contenu - Mobile: centré avec icône, Desktop: à gauche avec texte */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-3">
                  <motion.div
                    className={`flex-shrink-0 p-3 sm:p-2 rounded-lg bg-gradient-to-br ${suggestion.gradient}`}
                    animate={{
                      rotate: isHovered ? [0, -5, 5, 0] : 0,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                  </motion.div>
                  
                  {/* Texte caché sur mobile (<640px), visible sur tablettes+ */}
                  <div className="hidden sm:flex flex-grow min-w-0 flex-col">
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      {suggestion.displayText}
                    </p>
                    
                    {/* Texte complet au hover (desktop seulement) */}
                    <motion.p
                      className="text-xs text-muted-foreground mt-1 leading-relaxed"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: isHovered ? 1 : 0,
                        height: isHovered ? "auto" : 0
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {suggestion.fullPrompt}
                    </motion.p>
                    
                    <motion.div
                      className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground"
                      animate={{
                        x: isHovered ? 3 : 0,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <span>Essayer</span>
                      <motion.span
                        animate={{
                          x: isHovered ? [0, 2, 0] : 0,
                        }}
                        transition={{
                          repeat: isHovered ? Infinity : 0,
                          duration: 1,
                        }}
                      >
                        →
                      </motion.span>
                    </motion.div>
                  </div>
                  
                  {/* Texte court pour mobile uniquement */}
                  <p className="sm:hidden text-xs font-medium text-foreground text-center mt-1">
                    {suggestion.shortText}
                  </p>
                </div>

                {/* Bordure gradient au hover */}
                <motion.div
                  className={`absolute inset-0 rounded-xl bg-gradient-to-br ${suggestion.gradient}`}
                  style={{
                    padding: "1px",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude"
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 0.6 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export const SuggestedActions = memo(
  SuggestedActionsComponent,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) return false;
    return true;
  }
);