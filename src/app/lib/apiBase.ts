/** Default: hosted Azure API. Set VITE_API_BASE_URL in .env to use a local backend (e.g. http://localhost:8000/api/v1). */
export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  'https://carwash-ajfpdje5h5dqdjfj.centralus-01.azurewebsites.net/api/v1';
