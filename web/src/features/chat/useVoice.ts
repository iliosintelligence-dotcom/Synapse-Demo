"use client";

import { useCallback, useRef, useState } from "react";

/* The Web Speech API is not in TypeScript's DOM types in every version, so the little we use is described here. */
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}
type RecognitionCtor = new () => Recognition;

/** Voice typing. Every error path says something: a silent mic is indistinguishable from a broken one. */
export function useVoice(getText: () => string, setText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [hint, setHintState] = useState<string | null>(null);
  const recog = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const say = useCallback((msg: string) => {
    setHintState(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHintState(null), 5000);
  }, []);

  const start = useCallback((Ctor: RecognitionCtor) => {
    const inIframe = window.self !== window.top;
    const r = new Ctor();
    // en-NG is rejected by many Chrome builds; en-US is universally supported and handles Nigerian-accented English fine
    r.lang = navigator.language && /^en/i.test(navigator.language) ? navigator.language : "en-US";
    r.interimResults = true;
    r.continuous = true;
    const base = getText().trim() ? `${getText().trim()} ` : "";
    r.onresult = (e) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setText(base + txt);
    };
    r.onerror = (e) => {
      setListening(false);
      switch (e.error) {
        case "not-allowed": case "service-not-allowed":
          say(inIframe ? "Open this page in its own browser tab to use voice. It’s blocked inside the embedded preview." : "Microphone is blocked. Click the lock icon in the address bar, choose Allow, then tap the mic again."); break;
        case "no-speech": say("Didn’t catch that. Tap the mic and speak."); break;
        case "audio-capture": say("No microphone found. Check it’s connected, then try again."); break;
        case "network": say("Voice needs a connection. Check your network and try again."); break;
        case "aborted": break; // the person stopped it: no message needed
        case "language-not-supported":
          if (r.lang !== "en-US") { r.lang = "en-US"; try { r.start(); setListening(true); return; } catch { /* fall through */ } }
          say("Voice isn’t available in your browser here. Try Chrome or Edge."); break;
        default: say("Voice hit a snag. Tap the mic to try again.");
      }
    };
    r.onend = () => setListening(false);
    recog.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); say("Couldn’t start voice. Tap the mic to try again."); }
  }, [getText, setText, say]);

  const toggle = useCallback(async () => {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return say("Voice typing needs Chrome or Edge on this device.");
    if (!window.isSecureContext) return say("Voice needs a secure page. Open the app on localhost or https, not a raw IP address.");
    if (listening) { try { recog.current?.stop(); } catch { /* already stopped */ } setListening(false); return; }
    // Ask for mic permission the reliable way (getUserMedia shows the prompt); SpeechRecognition alone often throws "not-allowed" without ever asking.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()); // we only needed the grant
      } catch (err) {
        const n = (err as Error)?.name;
        if (n === "NotAllowedError" || n === "SecurityError") say("Mic access is blocked for this site. Click the lock icon in the address bar, set Microphone to Allow, then tap the mic again.");
        else if (n === "NotFoundError" || n === "DevicesNotFoundError") say("No microphone found on this device.");
        else say("Couldn’t reach the mic. Check your browser’s microphone permissions and try again.");
        return;
      }
    }
    start(Ctor);
  }, [listening, say, start]);

  return { listening, hint, toggle };
}
