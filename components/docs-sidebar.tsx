'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Book, Home, Building2, Layers, Database, Rocket, MessageSquare, Beaker, FlaskConical, BarChart3, CheckCircle2, Target } from "lucide-react";

const navigation = [
  {
    title: "Documentation",
    items: [
      { title: "Accueil", href: "/docs", icon: Home },
    ],
  },
  {
    title: "Architecture",
    items: [
      { title: "Vue d'ensemble", href: "/docs/architecture/overview", icon: Building2 },
      { title: "Stack technique", href: "/docs/architecture/stack", icon: Layers },
      { title: "Système RAG", href: "/docs/architecture/rag", icon: Database },
    ],
  },
  {
    title: "Concepts et Implémentation",
    items: [
      { title: "Chat", href: "/docs/usage/chat", icon: MessageSquare },
      { title: "Évaluation", href: "/docs/usage/evaluation", icon: Beaker },
    ],
  },
  {
    title: "Tests",
    items: [
      { title: "Dataset", href: "/docs/tests/dataset", icon: Database },
      { title: "Résultats d'évaluation", href: "/docs/tests/evaluation-results", icon: BarChart3 },
    ],
  },
  {
    title: "État actuel",
    items: [
      { title: "Prochaines étapes", href: "/docs/status/next-steps", icon: Target },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-slate-200 bg-white/80 backdrop-blur-sm">
      <SidebarHeader className="border-b border-slate-200 px-6 py-4 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="font-semibold text-slate-900">Documentation</h2>
            <p className="text-xs text-slate-600">TSP AI</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white/60">
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-slate-700 font-medium">{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        className={isActive 
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-l-2 border-blue-500" 
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
