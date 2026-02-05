# ALL CODE FILES TO IMPLEMENT
# Copy these files one by one as we go through each step

## FILE 1: TypeScript Types
## Location: frontend/src/types/workflow.ts
## Description: Type definitions for API responses

```typescript
// types/workflow.ts
export interface Task {
  id?: number;
  name: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  time_per_task?: number;
  category?: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface Workflow {
  id?: number;
  name: string;
  description?: string;
  tasks: Task[];
  created_at?: string;
  updated_at?: string;
}

export interface AnalysisResult {
  id: number;
  task_id: number;
  ai_readiness_score: number;
  time_saved_percentage?: number;
  recommendation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
