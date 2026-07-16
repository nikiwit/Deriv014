import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Table styling
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-200 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-2 text-slate-600">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50 transition-colors">{children}</tr>
          ),

          // Code block styling
          code: ({ node, className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-slate-100 text-derivhr-600 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-4 text-sm">
                <code className={`${className} font-mono`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          pre: ({ children }) => <>{children}</>,

          // Headers
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-800 mt-6 mb-3 border-b border-slate-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-slate-700 mt-5 mb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-derivhr-500 rounded-full"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-600 mt-4 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-slate-600 mt-3 mb-1">
              {children}
            </h4>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 my-2 space-y-1 text-slate-600">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 my-2 space-y-1 text-slate-600">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),

          // Blockquotes - styled for risk levels and important notes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-derivhr-400 bg-derivhr-50 pl-4 py-2 my-3 text-slate-600 rounded-r">
              {children}
            </blockquote>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="leading-relaxed my-2">{children}</p>
          ),

          // Bold/Strong for emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800">{children}</strong>
          ),

          // Italic
          em: ({ children }) => (
            <em className="italic text-slate-600">{children}</em>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-derivhr-600 hover:text-derivhr-700 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-slate-200" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
