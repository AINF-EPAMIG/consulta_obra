// utils/getFotoUrl.ts
// utils/getFotoUrl.ts
export function getFotoUrl(foto: string | null | undefined): string {
  if (!foto) return "/default-avatar.png"; // Fallback local
  return `https://epamigsistema.com/quadro_funcionarios/web/fotos/${foto}`;
}

