import { ReactNode } from 'react';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import { Mermaid } from '@/components/mermaid';

type MDXComponents = NonNullable<MDXRemoteProps['components']>;

const components: MDXComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-4xl font-bold mb-6 mt-8 first:mt-0 border-b-2 border-slate-200 pb-3 text-slate-900">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-3xl font-semibold mb-4 mt-8 border-b border-slate-200 pb-2 text-slate-800">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-2xl font-semibold mb-3 mt-6 text-slate-800">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-xl font-semibold mb-2 mt-4 text-slate-700">
      {children}
    </h4>
  ),
  p: ({ children }: any) => (
    <p className="mb-4 leading-7 text-slate-700">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="ml-4 text-slate-700">
      {children}
    </li>
  ),
  code: ({ children, className }: any) => {
    const isInline = !className;
    
    // Check if it's a mermaid code block
    if (className === 'language-mermaid') {
      return <Mermaid chart={String(children).trim()} />;
    }
    
    if (isInline) {
      return (
        <code className="bg-blue-50 text-blue-900 border border-blue-100 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className={className}>
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => {
    // Check if children contains a mermaid code block
    const childCode = children?.props;
    if (childCode?.className === 'language-mermaid') {
      return children;
    }
    
    return (
      <pre className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-4 rounded-lg overflow-x-auto mb-4 shadow-sm">
        {children}
      </pre>
    );
  },
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-400 bg-slate-50 pl-4 pr-4 py-2 italic my-4 text-slate-700 rounded-r-md shadow-sm">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-6 not-prose">
      <table className="w-full border-collapse border border-slate-200 rounded-lg shadow-sm bg-white">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gradient-to-br from-slate-50 to-slate-100">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-200">
      {children}
    </tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-blue-50/30 transition-colors duration-150">
      {children}
    </tr>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left font-semibold text-sm border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-sm border border-slate-200 text-slate-700">
      {children}
    </td>
  ),
  a: ({ children, href }: any) => (
    <a 
      href={href} 
      className="text-blue-600 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-all duration-200"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  hr: () => (
    <hr className="my-8 border-slate-200" />
  ),
  img: ({ src, alt, title }: any) => (
    <figure className="my-8 flex flex-col items-center bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200">
      <img 
        src={src} 
        alt={alt}
        title={title}
        className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200"
        loading="lazy"
      />
      {alt && (
        <figcaption className="text-sm text-slate-600 mt-3 text-center italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
};

export default components;
