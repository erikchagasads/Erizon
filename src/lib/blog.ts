// src/lib/blog.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "src", "content", "blog");

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  author: string;
  authorRole: string;
  coverImage: string;
  coverAlt: string;
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  author: string;
  coverImage: string;
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn("POSTS_DIR não encontrado:", POSTS_DIR);
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md"));

  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data } = matter(raw);
    return {
      slug:        data.slug        ?? file.replace(".md", ""),
      title:       data.title       ?? "",
      description: data.description ?? "",
      date:        data.date        ?? "",
      readTime:    data.readTime    ?? "5 min",
      category:    data.category    ?? "Geral",
      author:      data.author      ?? "Erik Chagas",
      coverImage:  data.coverImage  ?? "",
    } as BlogPostMeta;
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    console.warn("Post não encontrado:", filePath);
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug:        data.slug        ?? slug,
    title:       data.title       ?? "",
    description: data.description ?? "",
    date:        data.date        ?? "",
    readTime:    data.readTime    ?? "5 min",
    category:    data.category    ?? "Geral",
    author:      data.author      ?? "Erik Chagas",
    authorRole:  data.authorRole  ?? "Fundador do ErizonAI",
    coverImage:  data.coverImage  ?? "",
    coverAlt:    data.coverAlt    ?? "",
    content,
  };
}