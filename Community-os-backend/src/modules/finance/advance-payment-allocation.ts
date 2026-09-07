export interface AdvanceAssessment {
  id: string;
  dueDate: Date;
  createdAt: Date;
  collectible: number;
}

export interface AdvanceAllocation {
  assessmentId: string;
  amount: number;
}

export function allocateAdvanceAmount(
  assessments: AdvanceAssessment[],
  amount: number,
): { allocations: AdvanceAllocation[]; remainder: number } {
  let remainder = Math.max(amount, 0);
  const allocations: AdvanceAllocation[] = [];
  const ordered = [...assessments].sort(
    (a, b) =>
      a.dueDate.getTime() - b.dueDate.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const assessment of ordered) {
    if (remainder <= 0) break;
    const collectible = Math.max(assessment.collectible, 0);
    if (!collectible) continue;
    const allocated = Math.min(collectible, remainder);
    allocations.push({ assessmentId: assessment.id, amount: allocated });
    remainder -= allocated;
  }
  return { allocations, remainder };
}
