export interface Autor{
  nome: string;
  avatar: string;
}

export interface Clube{
  id: number;
  categoria: string;
  data: string;
  titulo: string;
  descricao: string;
  imagem: string;
  autor: Autor;
}

export interface Categoria{
  nome: string;
}

export interface ClubeDestaque{
  categoria: string;
  titulo: string;
  descricao: string;
  imagem: string;
  horario: string;
}
