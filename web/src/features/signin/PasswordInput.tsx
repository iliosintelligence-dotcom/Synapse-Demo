"use client";

import { useRef, useState } from "react";
import s from "./SignIn.module.css";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> { invalid?: boolean }

/**
 * A password field with a reveal. The input's own `type` is toggled (never a second element holding the text), so password managers,
 * autofill and the browser's save prompt all keep working. Nothing remembers the revealed state: it resets on every load, because a
 * password left visible on a returned-to tab is the failure this control is not worth causing.
 */
export function PasswordInput({ invalid, className, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);
  const toggle = () => {
    const el = ref.current;
    const pos = el?.selectionStart ?? null; // changing type sends the caret to the end in several browsers
    setShown((v) => !v);
    requestAnimationFrame(() => {
      el?.focus();
      if (el && pos != null) el.setSelectionRange(pos, pos);
    });
  };
  return (
    <div className={s.pw}>
      <input ref={ref} className={`${s.input} ${className ?? ""}`} type={shown ? "text" : "password"} aria-invalid={invalid || undefined} {...rest} />
      <button type="button" className={s.pwToggle} aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"} title={shown ? "Hide password" : "Show password"} onClick={toggle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {shown ? (
            <>
              <path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10.2 6 10.2 6a18.5 18.5 0 0 1-3.3 3.8" />
              <path d="M6.4 7.5A17.9 17.9 0 0 0 1.8 12s3.7 6 10.2 6a10 10 0 0 0 4.1-.8" />
              <path d="M9.8 9.9a3.1 3.1 0 0 0 4.3 4.3" />
              <path d="M3 3l18 18" />
            </>
          ) : (
            <>
              <path d="M1.8 12S5.5 5.4 12 5.4 22.2 12 22.2 12 18.5 18.6 12 18.6 1.8 12 1.8 12z" />
              <circle cx="12" cy="12" r="3.1" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
