import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Parse content into blocks: code blocks vs text blocks
  const blocks = React.useMemo(() => {
    const lines = content.split('\n');
    const result: Array<{ type: 'code' | 'text'; lang?: string; content: string }> = [];
    let inCode = false;
    let currentLang = '';
    let currentCode: string[] = [];
    let currentText: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (!inCode) {
          // Starting code block
          if (currentText.length > 0) {
            result.push({ type: 'text', content: currentText.join('\n') });
            currentText = [];
          }
          inCode = true;
          currentLang = line.trim().replace(/^```/, '').trim() || 'code';
          currentCode = [];
        } else {
          // Ending code block
          inCode = false;
          result.push({ type: 'code', lang: currentLang, content: currentCode.join('\n') });
          currentCode = [];
        }
      } else if (inCode) {
        currentCode.push(line);
      } else {
        currentText.push(line);
      }
    }

    if (inCode && currentCode.length > 0) {
      result.push({ type: 'code', lang: currentLang, content: currentCode.join('\n') });
    } else if (currentText.length > 0) {
      result.push({ type: 'text', content: currentText.join('\n') });
    }

    return result;
  }, [content]);

  return (
    <div className="markdown-content text-[15px] leading-relaxed text-[#ECECEC] space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.lang || 'code'} code={block.content} />;
        }
        return <FormattedTextBlock key={idx} text={block.content} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[#383838] bg-[#181818] shadow-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#262626] text-xs text-[#A0A0A0] font-mono select-none">
        <span className="uppercase tracking-wider font-semibold text-[#8E8E8E]">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#343434] hover:text-[#ECECEC] transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#10A37F]" />
              <span className="text-[#10A37F] font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#ECECEC]">
        <pre className="!bg-transparent !p-0 !m-0 !border-0 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const FormattedTextBlock: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\s*\n/);

  return (
    <div className="space-y-3">
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Blockquote
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n');
          return (
            <blockquote key={pIdx} className="border-l-4 border-[#10A37F] pl-3 py-1 my-2 text-[#B4B4B4] italic bg-[#262626]/40 rounded-r">
              <InlineText text={quoteLines} />
            </blockquote>
          );
        }

        // Unordered List
        if (trimmed.split('\n').every(l => l.trim().startsWith('- ') || l.trim().startsWith('* '))) {
          const items = trimmed.split('\n').map(l => l.trim().replace(/^[-*]\s+/, ''));
          return (
            <ul key={pIdx} className="list-disc pl-5 space-y-1 my-2 text-[#ECECEC]">
              {items.map((item, iIdx) => (
                <li key={iIdx}>
                  <InlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }

        // Ordered List
        if (trimmed.split('\n').every(l => /^\d+\.\s+/.test(l.trim()))) {
          const items = trimmed.split('\n').map(l => l.trim().replace(/^\d+\.\s+/, ''));
          return (
            <ol key={pIdx} className="list-decimal pl-5 space-y-1 my-2 text-[#ECECEC]">
              {items.map((item, iIdx) => (
                <li key={iIdx}>
                  <InlineText text={item} />
                </li>
              ))}
            </ol>
          );
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={pIdx} className="text-lg font-semibold text-[#FFFFFF] mt-4 mb-2">
              <InlineText text={trimmed.substring(4)} />
            </h3>
          );
        }

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={pIdx} className="text-xl font-bold text-[#FFFFFF] mt-5 mb-2 border-b border-[#383838] pb-1">
              <InlineText text={trimmed.substring(3)} />
            </h2>
          );
        }

        // Heading 1
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={pIdx} className="text-2xl font-bold text-[#FFFFFF] mt-6 mb-3 border-b border-[#383838] pb-1.5">
              <InlineText text={trimmed.substring(2)} />
            </h1>
          );
        }

        // Standard Paragraph (handle internal single linebreaks)
        const subLines = para.split('\n');
        return (
          <p key={pIdx} className="text-[#ECECEC] leading-relaxed">
            {subLines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                <InlineText text={line} />
                {lIdx < subLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

const InlineText: React.FC<{ text: string }> = ({ text }) => {
  // Regex to match inline code `code`, bold **bold**, or italic *italic*
  const parts = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Check for inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Check for bold
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    
    // Find closest match
    let firstMatch: { index: number; length: number; render: React.ReactNode } | null = null;

    if (codeMatch && codeMatch.index !== undefined) {
      firstMatch = {
        index: codeMatch.index,
        length: codeMatch[0].length,
        render: (
          <code key={keyIndex++} className="bg-[#2A2A2A] text-[#10A37F] px-1.5 py-0.5 rounded text-[13px] font-mono border border-[#383838]">
            {codeMatch[1]}
          </code>
        ),
      };
    }

    if (boldMatch && boldMatch.index !== undefined) {
      if (!firstMatch || boldMatch.index < firstMatch.index) {
        firstMatch = {
          index: boldMatch.index,
          length: boldMatch[0].length,
          render: (
            <strong key={keyIndex++} className="font-semibold text-white">
              {boldMatch[1]}
            </strong>
          ),
        };
      }
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(remaining.substring(0, firstMatch.index));
      }
      parts.push(firstMatch.render);
      remaining = remaining.substring(firstMatch.index + firstMatch.length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
};
