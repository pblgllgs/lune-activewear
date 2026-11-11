export interface Guide {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface GuideInput {
  slug?: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  published: boolean;
}