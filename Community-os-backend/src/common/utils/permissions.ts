export function userPermissionCodes(user: any): string[] {
  if (!user) return [];

  return (
    user.roles?.flatMap((r: any) =>
      r.role?.permissions?.map((p: any) => p.permission?.code),
    ) ?? []
  ).filter((code: string | undefined): code is string => Boolean(code));
}

export function hasAnyPermission(user: any, codes: string[]): boolean {
  const userCodes = userPermissionCodes(user);
  return codes.some((code) => userCodes.includes(code));
}
