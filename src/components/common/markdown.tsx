"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

type Props = { content: string; isStreaming?: boolean };

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ["className"]],
    span: [...(defaultSchema.attributes?.span || []), ["className"]],
    pre:  [...(defaultSchema.attributes?.pre  || []), ["className"]],
  },
};

export function Markdown({ content, isStreaming = false }: Props) {
  if (!content) {
    return isStreaming ? <span className="caret" /> : null;
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, schema],
          [rehypeHighlight, { ignoreMissing: true }],
        ]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ className, children, ...props }) => (
            <code className={`whitespace-pre-wrap ${className || ""}`} {...props}>
              {children}
            </code>
          ),
          pre: ({ className, children, ...props }) => (
            <pre className={`rounded-md border p-3 ${className || ""}`} {...props}>
              {children}
            </pre>
          ),
          img: (props) => <img {...props} className="max-h-96 rounded" />,
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && <span className="caret" style={{ marginLeft: 4 }} />}
    </div>
  );
}
