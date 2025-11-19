import { tool } from "@langchain/core/tools";
import { z } from "zod";

interface City {
  id: string;
  x: number;
  y: number;
}

function calculateDistance(city1: City, city2: City): number {
  return Math.sqrt(
    Math.pow(city1.x - city2.x, 2) + Math.pow(city1.y - city2.y, 2)
  );
}

function calculateTotalDistance(route: City[]): number {
  let distance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    distance += calculateDistance(route[i], route[i + 1]);
  }
  // Return to start
  distance += calculateDistance(route[route.length - 1], route[0]);
  return distance;
}

function nearestNeighbor(cities: City[]): City[] {
  if (cities.length === 0) return [];
  
  const unvisited = [...cities];
  const route: City[] = [unvisited.shift()!];
  
  while (unvisited.length > 0) {
    const current = route[route.length - 1];
    let nearestIndex = 0;
    let minDistance = calculateDistance(current, unvisited[0]);
    
    for (let i = 1; i < unvisited.length; i++) {
      const dist = calculateDistance(current, unvisited[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }
    
    route.push(unvisited.splice(nearestIndex, 1)[0]);
  }
  
  return route;
}

function twoOpt(route: City[]): City[] {
  let improved = true;
  let bestRoute = [...route];
  let bestDistance = calculateTotalDistance(bestRoute);
  
  while (improved) {
    improved = false;
    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let j = i + 1; j < bestRoute.length; j++) {
        const newRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, j + 1).reverse(),
          ...bestRoute.slice(j + 1)
        ];
        
        const newDistance = calculateTotalDistance(newRoute);
        if (newDistance < bestDistance) {
          bestRoute = newRoute;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }
  
  return bestRoute;
}

export const solveTSP = tool(
  async ({ cities }: { cities: City[] }) => {
    try {
      if (cities.length < 2) {
        return JSON.stringify({
          route: cities,
          distance: 0,
          message: "Need at least 2 cities to solve TSP.",
        });
      }

      // Initial solution using Nearest Neighbor
      const initialRoute = nearestNeighbor(cities);
      
      // Improve using 2-opt
      const optimizedRoute = twoOpt(initialRoute);
      
      const totalDistance = calculateTotalDistance(optimizedRoute);

      // Map city coordinates to Benin coordinates (Latitude/Longitude)
      const beninCities: Record<string, { lat: number; lng: number }> = {
        cotonou: { lat: 6.4969, lng: 2.6289 },
        "porto-novo": { lat: 6.4956, lng: 2.6289 },
        ouidah: { lat: 6.3685, lng: 2.0834 },
        abomey: { lat: 6.9881, lng: 1.9906 },
        ganvié: { lat: 6.4333, lng: 2.4333 },
        parakou: { lat: 9.3392, lng: 2.6289 },
        natitingou: { lat: 10.3063, lng: 1.3808 },
        "grand-popo": { lat: 6.2981, lng: 1.8458 },
        savalou: { lat: 7.9608, lng: 1.9608 },
        pendjari: { lat: 10.8, lng: 2.0 },
      };

      // Convert cities to map format with actual Benin coordinates
      const mapCities = cities.map((city) => {
        const name = city.id.toLowerCase().replace(/_/g, "-");
        const coords = beninCities[name];
        return {
          id: city.id,
          name: city.id.replace(/_/g, " ").toUpperCase(),
          x: coords?.lng || city.x,
          y: coords?.lat || city.y,
        };
      });

      const mapRoute = optimizedRoute.map((city) => {
        const name = city.id.toLowerCase().replace(/_/g, "-");
        const coords = beninCities[name];
        return {
          id: city.id,
          name: city.id.replace(/_/g, " ").toUpperCase(),
          x: coords?.lng || city.x,
          y: coords?.lat || city.y,
        };
      });

      const mapCode = `
\`\`\`tsx interactive
import { useEffect, useRef } from "react";

export default function BenimMap() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const mapWidth = width - 2 * padding;
    const mapHeight = height - 2 * padding;

    // Benin bounds
    const latMin = 6.0;
    const latMax = 10.9;
    const lngMin = 1.0;
    const lngMax = 3.2;

    ctx.fillStyle = "#f0f9ff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(padding, padding, mapWidth, mapHeight);

    const toCanvasX = (lng) =>
      padding + ((lng - lngMin) / (lngMax - lngMin)) * mapWidth;
    const toCanvasY = (lat) =>
      padding + mapHeight - ((lat - latMin) / (latMax - latMin)) * mapHeight;

    const cities = ${JSON.stringify(mapCities)};
    const route = ${JSON.stringify(mapRoute)};

    // Draw routes
    if (route.length > 1) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);

      for (let i = 0; i < route.length; i++) {
        const current = route[i];
        const next = route[(i + 1) % route.length];

        const x1 = toCanvasX(current.x);
        const y1 = toCanvasY(current.y);
        const x2 = toCanvasX(next.x);
        const y2 = toCanvasY(next.y);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw arrows
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowSize = 10;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - arrowSize * Math.cos(angle - Math.PI / 6),
          y2 - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - arrowSize * Math.cos(angle + Math.PI / 6),
          y2 - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.setLineDash([]);
    }

    // Draw cities
    cities.forEach((city) => {
      const x = toCanvasX(city.x);
      const y = toCanvasY(city.y);

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#1e40af";
      ctx.lineWidth = 2;
      ctx.stroke();

      const label = city.name;
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      const textWidth = ctx.measureText(label).width;
      const labelX = x - textWidth / 2;
      const labelY = y - 20;
      ctx.fillRect(labelX - 4, labelY - 12, textWidth + 8, 16);

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(label, x, labelY);

      const routeIndex = route.findIndex((c) => c.id === city.id);
      if (routeIndex !== -1) {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((routeIndex + 1).toString(), x, y + 18);
      }
    });

    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Itinéraire Optimal - Bénin", padding, 20);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(\`Distance totale: ${totalDistance.toFixed(2)} km\`, padding, height - 10);
  }, []);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full border rounded-lg bg-blue-50" />;
}
\`\`\`

**Itinéraire optimisé trouvé !**

- Distance totale: **${totalDistance.toFixed(2)} km**
- Nombre de villes: **${cities.length}**
- Distance moyenne: **${(totalDistance / cities.length).toFixed(2)} km/ville**

**Ordre de visite:**
${optimizedRoute.map((city, idx) => `${idx + 1}. ${city.id}`).join("\n")}
`;

      return JSON.stringify({
        route: optimizedRoute,
        distance: totalDistance,
        message: `Itinéraire optimal trouvé ! ${cities.length} villes, distance totale: ${totalDistance.toFixed(2)} km`,
        artifact: {
          type: "code",
          content: mapCode
        }
      });
    } catch (error) {
      return JSON.stringify({
        error: "Failed to solve TSP",
        details: error instanceof Error ? error.message : "Unknown error",
        artifact: null
      });
    }
  },
  {
    name: "solve_tsp",
    description: "Solves the Traveling Salesperson Problem (TSP) for a given list of cities with coordinates. Returns the optimized route and total distance.",
    schema: z.object({
      cities: z.array(
        z.object({
          id: z.string().describe("Unique identifier for the city"),
          x: z.number().describe("X coordinate"),
          y: z.number().describe("Y coordinate"),
        })
      ).describe("List of cities to visit"),
    }),
  }
);
