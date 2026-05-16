import React, { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Eye, Code, Copy, Check, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

function detectContentType(code) {
  if (!code) return null;
  const trimmed = code.trim();
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return 'html';
  if (/^<\?xml/i.test(trimmed)) return 'xml';
  if (/^<svg[\s>]/i.test(trimmed)) return 'svg';
  if (/^%PDF-/i.test(trimmed)) return 'pdf';
  if (/<html[\s>]/i.test(trimmed) && /<\/html>/i.test(trimmed)) return 'html';
  if (/^<[a-zA-Z][\s\S]*>/.test(trimmed) && /<\/[a-zA-Z]+>\s*$/.test(trimmed)) {
    if (/<body[\s>]/i.test(trimmed) || /<div[\s>]/i.test(trimmed) || /<head[\s>]/i.test(trimmed)) return 'html';
    return 'xml';
  }
  return null;
}

function getSyntaxLanguage(type) {
  switch (type) {
    case 'html': return 'html';
    case 'xml': return 'xml';
    case 'svg': return 'svg';
    case 'csv': return 'text';
    default: return 'markup';
  }
}

function CsvTable({ data }) {
  const rows = useMemo(() => {
    if (!data) return [];
    const lines = data.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      cells.push(current.trim());
      return cells;
    });
  }, [data]);

  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-700 dark:border-zinc-800">
      <table className="w-full text-xs text-left">
        <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-300">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium border-b border-zinc-200 dark:border-zinc-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-zinc-600 dark:text-zinc-400">
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExcelRenderer({ code }) {
  const tableData = useMemo(() => {
    try {
      const workbook = XLSX.read(code, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      return { sheets: workbook.SheetNames, data: jsonData, sheetName };
    } catch {
      return null;
    }
  }, [code]);

  if (!tableData || !tableData.data.length) {
    return <div className="text-zinc-500 text-xs p-4">Could not parse spreadsheet data</div>;
  }

  const header = tableData.data[0] || [];
  const body = tableData.data.slice(1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <FileSpreadsheet size={12} />
        <span>Sheet: {tableData.sheetName}</span>
      </div>
      <div className="overflow-x-auto rounded-md border border-zinc-700 dark:border-zinc-800">
        <table className="w-full text-xs text-left">
          <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-300">
            <tr>
              {header.map((h, i) => (
                <th key={i} className="px-3 py-2 font-medium border-b border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                  {h != null ? String(h) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-zinc-600 dark:text-zinc-400">
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                {header.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                    {row[ci] != null ? String(row[ci]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HtmlPreview({ code }) {
  const srcDoc = useMemo(() => {
    const baseStyle = `<style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #fff; color: #1a1a1a; }
      img { max-width: 100%; height: auto; }
    </style>`;
    if (/<html[\s>]/i.test(code)) {
      return code.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`);
    }
    return `<!DOCTYPE html><html><head>${baseStyle}</head><body>${code}</body></html>`;
  }, [code]);

  return (
    <iframe
      srcDoc={srcDoc}
      title="HTML Preview"
      className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white"
      style={{ minHeight: '300px', maxHeight: '600px' }}
      sandbox="allow-scripts allow-same-origin"
      onLoad={(e) => {
        try {
          const doc = e.target.contentDocument;
          if (doc && doc.body) {
            const h = doc.body.scrollHeight + 32;
            e.target.style.height = Math.min(Math.max(h, 200), 600) + 'px';
          }
        } catch {}
      }}
    />
  );
}

function SvgPreview({ code }) {
  return (
    <div
      className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white p-4 overflow-auto"
      style={{ maxHeight: '500px' }}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

function XmlPreview({ code }) {
  const formatted = useMemo(() => {
    try {
      let indent = 0;
      const lines = code.replace(/>\s*</g, '>\n<').split('\n');
      return lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        const result = '  '.repeat(indent) + trimmed;
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
          indent++;
        }
        return result;
      }).join('\n');
    } catch {
      return code;
    }
  }, [code]);

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700 overflow-auto" style={{ maxHeight: '500px' }}>
      <SyntaxHighlighter
        language="xml"
        style={oneDark}
        customStyle={{ margin: 0, padding: '12px', background: '#0a0a0a', fontSize: '12px' }}
        wrapLongLines
      >
        {formatted}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ContentRenderer({ code, type: propType }) {
  const [mode, setMode] = useState('rendered');
  const [copied, setCopied] = useState(false);

  const detectedType = propType || detectContentType(code);
  const isRenderable = ['html', 'svg', 'xml', 'csv', 'excel'].includes(detectedType);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const extensions = { html: 'html', svg: 'svg', xml: 'xml', csv: 'csv', excel: 'xlsx' };
    const mimeTypes = {
      html: 'text/html', svg: 'image/svg+xml', xml: 'application/xml',
      csv: 'text/csv', excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const ext = extensions[detectedType] || 'txt';
    const mime = mimeTypes[detectedType] || 'text/plain';
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (mode === 'code' || !isRenderable) {
      return (
        <SyntaxHighlighter
          language={getSyntaxLanguage(detectedType)}
          style={oneDark}
          customStyle={{
            margin: 0, padding: '12px', background: '#0a0a0a',
            fontSize: '12px', borderRadius: '6px', maxHeight: '500px',
          }}
          wrapLongLines
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      );
    }

    switch (detectedType) {
      case 'html': return <HtmlPreview code={code} />;
      case 'svg': return <SvgPreview code={code} />;
      case 'xml': return <XmlPreview code={code} />;
      case 'csv': return <CsvTable data={code} />;
      case 'excel': return <ExcelRenderer code={code} />;
      default: return null;
    }
  };

  const typeLabel = detectedType ? detectedType.toUpperCase() : 'CODE';

  return (
    <div className="my-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/80 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700/50 px-2 py-0.5 rounded">
            {typeLabel}
          </span>
          {isRenderable && (
            <div className="flex items-center bg-zinc-200 dark:bg-zinc-700/30 rounded-lg overflow-hidden p-0.5">
              <button
                onClick={() => setMode('rendered')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors rounded-md ${
                  mode === 'rendered'
                    ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <Eye size={12} />
                Render
              </button>
              <button
                onClick={() => setMode('code')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors rounded-md ${
                  mode === 'code'
                    ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <Code size={12} />
                Code
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
            title="Copy code"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
            title="Download file"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export { detectContentType };
