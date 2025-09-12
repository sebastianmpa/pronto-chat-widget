import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdown(md?: string) {
  if (!md) return null;
  
  // Configurar renderer personalizado para enlaces
  const renderer = new marked.Renderer();
  renderer.link = ({ href, title, tokens }) => {
    const text = tokens.map(token => token.raw || '').join('');
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
  };
  
  let html = DOMPurify.sanitize(marked.parse(md, { renderer }) as string, { USE_PROFILES: { html: true } });
  
  // Post-procesar para asegurar que todos los enlaces tengan target="_blank"
  html = html.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
    // Si ya tiene target="_blank", no modificar
    if (/target\s*=\s*["']_blank["']/i.test(attrs)) {
      return match;
    }
    // Agregar target="_blank" y rel="noopener noreferrer" si no los tiene
    let newAttrs = attrs;
    if (!/target\s*=/i.test(newAttrs)) {
      newAttrs += ' target="_blank"';
    }
    if (!/rel\s*=/i.test(newAttrs)) {
      newAttrs += ' rel="noopener noreferrer"';
    }
    return `<a ${newAttrs}>`;
  });
  
  // Mejorar texto de enlaces existentes que contienen PDFs
  html = html.replace(/<a\s+([^>]*?)>(.*?)<\/a>/gi, (match, attrs, text) => {
    // Si el href contiene un PDF, cambiar el texto a algo más amigable
    if (attrs.includes('.pdf')) {
      return `<a ${attrs}>Descargar manual de partes</a>`;
    }
    return match;
  });
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
