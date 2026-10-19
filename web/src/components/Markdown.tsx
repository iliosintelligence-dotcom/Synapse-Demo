import { Fragment, type ReactNode } from "react";

/**
 * A tiny, safe markdown renderer for Tayo's replies: **bold**, *italic*, `code`, bullet and numbered lists, paragraphs. It builds React
 * elements and never injects HTML, so text from the model can never become markup. Anything it does not recognise is plain text.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|(^|[^*])\*([^*\n]+)\*(?!\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1] != null) out.push(<code key={k}>{m[1]}</code>);
    else if (m[2] != null || m[3] != null) out.push(<strong key={k}>{m[2] ?? m[3]}</strong>);
    else {
      if (m[4]) out.push(m[4]);
      out.push(<em key={k}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = String(text ?? "").split(/\n/);
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const key = `l${blocks.length}`;
    const items = list.items.map((it, n) => <li key={n}>{inline(it, `${key}-${n}`)}</li>);
    blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
    list = null;
  };
  lines.forEach((line, n) => {
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const ordered = !!ol && !ul;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((ul ?? ol)![1]);
    } else {
      flush();
      if (line.trim()) blocks.push(<p key={`p${n}`}>{inline(line, `p${n}`)}</p>);
    }
  });
  flush();
  return <Fragment>{blocks.length ? blocks : <p>{text}</p>}</Fragment>;
}
