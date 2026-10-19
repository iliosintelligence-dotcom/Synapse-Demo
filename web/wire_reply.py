def edit(p, f):
    t = open(p, encoding='utf8').read()
    t2 = f(t)
    assert t2 != t, p
    open(p, 'w', encoding='utf8').write(t2)

css = """
/* comment replies */
.reply { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 14px; background: var(--surface-2); }
.replySum { display: flex; gap: 10px; align-items: center; font-size: 14px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--ink-dim); flex: none; }
.dotOn { background: #25683f; }
.replyBody { display: grid; gap: 10px; flex: 1 1 100%; }
.check { display: flex; gap: 10px; align-items: center; font-size: 14px; }
.field { display: grid; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--ink-muted); }
.field input, .field textarea { padding: 11px 13px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--ink); font: 500 14px var(--font-sans); }
.preview { padding: 12px 14px; border-radius: 12px; background: var(--surface); border: 1px dashed var(--border); display: grid; gap: 6px; }
.preview pre { margin: 0; white-space: pre-wrap; font: 500 13.5px/1.5 var(--font-sans); overflow-wrap: anywhere; }
.k { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
"""
p = 'src/features/portal/panes/Channels.module.css'
t = open(p, encoding='utf8').read()
if '/* comment replies */' not in t:
    open(p, 'w', encoding='utf8').write(t.rstrip('\n') + '\n' + css)

edit('src/features/portal/panes/ChannelsPanel.tsx', lambda t: t.replace('import { goTo } from "./BillingPane";', 'import { goTo } from "./BillingPane";\nimport { ReplyCard } from "./ReplyCard";', 1).replace('      {adding && (\n        <div className={s.add}', '      <ReplyCard />\n\n      {adding && (\n        <div className={s.add}', 1))
edit('README.md', lambda t: t.replace("Still on the original portal: the automatic WhatsApp Status offer after a post goes out, the comment-reply settings, ", "Comment-reply settings moved too (`ReplyCard.tsx`, under Channels, owner and admin only). Still on the original portal: the automatic WhatsApp Status offer after a post goes out, "))
