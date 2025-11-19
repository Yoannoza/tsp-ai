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
          message: "Need at least 2 cities to solve TSP."
        });
      }

      // Initial solution using Nearest Neighbor
      const initialRoute = nearestNeighbor(cities);
      
      // Improve using 2-opt
      const optimizedRoute = twoOpt(initialRoute);
      
      const totalDistance = calculateTotalDistance(optimizedRoute);

      return JSON.stringify({
        route: optimizedRoute,
        distance: totalDistance,
        message: `Solved TSP for ${cities.length} cities. Total distance: ${totalDistance.toFixed(2)}`
      });
    } catch (error) {
      return JSON.stringify({
        error: "Failed to solve TSP",
        details: error instanceof Error ? error.message : "Unknown error"
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
