import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import mdxComponents from './mdx-components';

export async function getDocContent(slug: string[]) {
  const docPath = slug.length === 0 
    ? path.join(process.cwd(), 'docs', 'index.md')
    : path.join(process.cwd(), 'docs', ...slug) + '.md';

  try {
    const fileContent = fs.readFileSync(docPath, 'utf8');
    const { content, data } = matter(fileContent);
    
    return {
      content,
      frontmatter: data,
    };
  } catch (error) {
    return null;
  }
}

export function DocContent({ content }: { content: string }) {
  return (
    <div className="relative min-h-screen">
      <article className="docs-content prose prose-slate prose-lg max-w-5xl px-10 py-8 mx-auto my-8 prose-headings:scroll-mt-20">
        <MDXRemote source={content} components={mdxComponents} />
      </article>
    </div>
  );
}
