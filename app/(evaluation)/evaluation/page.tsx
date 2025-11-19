import { Dashboard } from '@/components/evaluation/dashboard';

export const metadata = {
  title: 'Evaluation Dashboard - TSP AI',
  description: 'LLM as Judge evaluation dashboard with Gemini',
};

export default function EvaluationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Dashboard />
    </div>
  );
}
