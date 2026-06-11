/** Shared result shape for form server actions used with useActionState. */
export interface ActionState {
  error?: string;
  success?: string;
}

export function firstZodError(error: {
  issues: { message: string; path: PropertyKey[] }[];
}): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
