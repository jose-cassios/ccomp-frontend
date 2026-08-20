import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'eventos/novo',
    renderMode: RenderMode.Client,
  },
  {
    path: 'eventos/:id/editar',
    renderMode: RenderMode.Client,
  },
  {
    path: 'eventos/:id',
    renderMode: RenderMode.Server,
  },
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
