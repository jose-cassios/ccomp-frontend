import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/usuarios',
    renderMode: RenderMode.Client,
  },
  {
    path: 'noticias/nova',
    renderMode: RenderMode.Client,
  },
  {
    path: 'noticias/:id/editar',
    renderMode: RenderMode.Client,
  },
  {
    path: 'news/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
