import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownUp,
  AudioLines,
  Globe2,
  LoaderCircle,
  Moon,
  Radio,
  RotateCw,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { translateText } from "@/lib/translation";

const languages = [
  "English",
  "Hindi",
  "Spanish",
  "Japanese",
  "French",
  "German",
  "Chinese (Simplified)",
  "Arabic",
  "Portuguese",
  "Korean",
  "Italian",
];

type Speaker = "User A" | "User B";
type ConnectionStatus = "connecting" | "connected" | "error";
type TranslationStatus = "waiting" | "translating" | "translated" | "error";
type TranslationPreview = {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: TranslationStatus;
  error?: string;
};
type TypingPayload = {
  sender: Speaker;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  clientId: string;
};
type TranslationPayload = TypingPayload & { translatedText: string };
type TranslationErrorPayload = TypingPayload & { error: string };

function isTypingPayload(payload: unknown): payload is TypingPayload {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("sender" in payload) ||
    !("text" in payload) ||
    !("sourceLanguage" in payload) ||
    !("targetLanguage" in payload) ||
    !("clientId" in payload)
  ) {
    return false;
  }

  const { sender, text, sourceLanguage, targetLanguage, clientId } = payload;
  return (
    (sender === "User A" || sender === "User B") &&
    typeof text === "string" &&
    typeof sourceLanguage === "string" &&
    languages.some((language) => language === sourceLanguage) &&
    typeof targetLanguage === "string" &&
    languages.some((language) => language === targetLanguage) &&
    typeof clientId === "string" &&
    clientId.length > 0
  );
}

function isTranslationPayload(payload: unknown): payload is TranslationPayload {
  return (
    isTypingPayload(payload) &&
    "translatedText" in payload &&
    typeof payload.translatedText === "string"
  );
}
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrossTalk — Live Translation Room" },
      {
        name: "description",
        content: "Live typing and AI translation for a two-sided conversation.",
      },
      { property: "og:title", content: "CrossTalk — Live Translation Room" },
      {
        property: "og:description",
        content: "Live typing and AI translation for a two-sided conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type SpeakerPanelProps = {
  side: "a" | "b";
  name: string;
  initials: string;
  language: string;
  incomingFrom: string;
  incomingText: TranslationPreview;
  draft: string;
  onLanguageChange: (language: string) => void;
  onDraftChange: (text: string, language: string) => void;
  onRetryTranslation: () => void;
  canRetryTranslation: boolean;
};

function SpeakerPanel({
  side,
  name,
  initials,
  language,
  incomingFrom,
  incomingText,
  draft,
  onLanguageChange,
  onDraftChange,
  onRetryTranslation,
  canRetryTranslation,
}: SpeakerPanelProps) {
  const isTyping = draft.trim().length > 0;

  return (
    <section className={`speaker-panel speaker-${side} flex min-h-[39rem] flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="speaker-avatar grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{side === "a" ? "YOUR SIDE" : "THEIR SIDE"}</p>
          </div>
        </div>

        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger aria-label={`${name}'s language`} className="h-10 w-[10.5rem] rounded-lg border-border/80 bg-background/60 text-sm">
            <Globe2 className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-10 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-7 flex items-center gap-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">
            <span className="speaker-signal inline-flex items-center gap-2">
              <AudioLines className="size-4" />
              <span>INCOMING FROM {incomingFrom.toUpperCase()}</span>
            </span>
            {incomingText.sourceText && (
              <span className="translation-tag">GROQ AI TRANSLATION</span>
            )}
          </div>
          {incomingText.sourceText ? (
            <div className="translation-result">
              <p className="source-copy">
                <span>{incomingText.sourceLanguage} original</span>
                {incomingText.sourceText}
              </p>
              {incomingText.status === "translating" ? (
                <div className="translation-status" role="status" aria-live="polite">
                  <LoaderCircle className="size-4 animate-spin" />
                  <span>Translating to {incomingText.targetLanguage}…</span>
                </div>
              ) : incomingText.status === "translated" ? (
                <p
                  key={`${incomingText.targetLanguage}:${incomingText.translatedText}`}
                  aria-live="polite"
                  className="incoming-copy"
                >
                  {incomingText.translatedText}
                </p>
              ) : incomingText.status === "error" ? (
                <div className="translation-error" role="alert">
                  <p>{incomingText.error}</p>
                  {canRetryTranslation && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetryTranslation}
                      className="mt-3 rounded-full"
                    >
                      <RotateCw className="size-3.5" />
                      Try again
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="waiting-copy">Waiting for {incomingFrom}…</p>
          )}
        </div>

        <div className={`composer-surface rounded-xl border p-4 transition-all duration-300 sm:p-5 ${isTyping ? "composer-active" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className={`speaker-dot ${isTyping ? "is-live" : ""}`} />
              {isTyping ? "Speaking now" : "Your message"}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{draft.length}/500</span>
          </div>
          <Textarea
            aria-label={`Message from ${name}`}
            maxLength={500}
            onChange={(event) => onDraftChange(event.target.value, language)}
            placeholder="Type what you want to say…"
            value={draft}
            className="min-h-28 resize-none border-0 bg-transparent px-0 py-1 text-base leading-7 shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 sm:text-lg"
          />
          <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
            <span className="text-xs text-muted-foreground">
              Translated into {incomingText.sourceText ? incomingText.targetLanguage : language}
            </span>
            <Button variant="ghost" size="icon" aria-label={`Clear ${name}'s message`} title="Clear message" disabled={!draft} onClick={() => onDraftChange("", language)} className="size-8 rounded-full text-muted-foreground">
              <span className="sr-only">Clear message</span>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function isTranslationErrorPayload(payload: unknown): payload is TranslationErrorPayload {
  return (
    isTypingPayload(payload) &&
    "error" in payload &&
    typeof payload.error === "string"
  );
}

function Index() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [languageA, setLanguageA] = useState("English");
  const [languageB, setLanguageB] = useState("Spanish");
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");
  const [incomingForA, setIncomingForA] = useState<TranslationPreview>({
    sourceText: "",
    translatedText: "",
    sourceLanguage: "Spanish",
    targetLanguage: "English",
    status: "waiting",
  });
  const [incomingForB, setIncomingForB] = useState<TranslationPreview>({
    sourceText: "",
    translatedText: "",
    sourceLanguage: "English",
    targetLanguage: "Spanish",
    status: "waiting",
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const translate = useServerFn(translateText);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const channelReadyRef = useRef(false);
  const pendingTypingRef = useRef(new Map<Speaker, TypingPayload>());
  const translationTimersRef = useRef(new Map<Speaker, ReturnType<typeof setTimeout>>());
  const translationRequestIdsRef = useRef(new Map<Speaker, number>());
  const latestRemoteTextRef = useRef(
    new Map<Speaker, TypingPayload>(),
  );
  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", theme === "light");
    return () => document.documentElement.classList.remove("theme-light");
  }, [theme]);

  const scheduleTranslation = useCallback(
    (
      sender: Speaker,
      text: string,
      sourceLanguage: string,
      targetLanguage: string,
      clientId: string,
    ) => {
      const timers = translationTimersRef.current;
      const previousTimer = timers.get(sender);
      if (previousTimer) clearTimeout(previousTimer);

      const requestId = (translationRequestIdsRef.current.get(sender) ?? 0) + 1;
      translationRequestIdsRef.current.set(sender, requestId);
      const updatePreview = sender === "User A" ? setIncomingForB : setIncomingForA;

      if (!text.trim()) {
        updatePreview({
          sourceText: "",
          translatedText: "",
          sourceLanguage,
          targetLanguage,
          status: "waiting",
        });
        timers.delete(sender);
        return;
      }

      updatePreview({
        sourceText: text,
        translatedText: "",
        sourceLanguage,
        targetLanguage,
        status: "translating",
      });

      const timer = setTimeout(() => {
        void translate({
          data: { text, sourceLanguage, targetLanguage },
        })
          .then((translatedText) => {
            if (translationRequestIdsRef.current.get(sender) !== requestId) return;

            updatePreview({
              sourceText: text,
              translatedText,
              sourceLanguage,
              targetLanguage,
              status: "translated",
            });

            const channel = channelRef.current;
            if (!channel || !channelReadyRef.current) {
              updatePreview({
                sourceText: text,
                translatedText: "",
                sourceLanguage,
                targetLanguage,
                status: "error",
                error: "Translation finished, but the live room disconnected before sharing it.",
              });
              return;
            }

            void channel
              .send({
                type: "broadcast",
                event: "translation",
                payload: {
                  sender,
                  text,
                  sourceLanguage,
                  targetLanguage,
                  clientId,
                  translatedText,
                },
              })
              .then((result) => {
                if (result !== "ok") {
                  console.error(`[Supabase Realtime] Translation broadcast failed: ${result}`);
                }
              })
              .catch((error: unknown) => {
                console.error("[Supabase Realtime] Translation broadcast failed:", error);
              });
          })
          .catch((error: unknown) => {
            if (translationRequestIdsRef.current.get(sender) !== requestId) return;

            const message =
              error instanceof Error
                ? error.message
                : "Translation failed. Please try again.";
            updatePreview({
              sourceText: text,
              translatedText: "",
              sourceLanguage,
              targetLanguage,
              status: "error",
              error: message,
            });

            const channel = channelRef.current;
            if (channel && channelReadyRef.current) {
              void channel.send({
                type: "broadcast",
                event: "translation-error",
                payload: {
                  sender,
                  text,
                  sourceLanguage,
                  targetLanguage,
                  clientId,
                  error: message,
                },
              });
            }
          })
          .finally(() => {
            if (translationTimersRef.current.get(sender) === timer) {
              translationTimersRef.current.delete(sender);
            }
          });
      }, 700);

      timers.set(sender, timer);
    },
    [translate],
  );

  const scheduleTranslationRef = useRef(scheduleTranslation);
  scheduleTranslationRef.current = scheduleTranslation;
  const retryTranslation = (sender: Speaker) => {
    const latest = latestRemoteTextRef.current.get(sender);
    if (!latest || latest.clientId !== clientIdRef.current || !latest.text.trim()) return;

    scheduleTranslation(
      sender,
      latest.text,
      latest.sourceLanguage,
      latest.targetLanguage,
      latest.clientId,
    );
  };

  useEffect(() => {
    for (const [sender, latest] of latestRemoteTextRef.current) {
      if (latest.clientId === clientIdRef.current) {
        const targetLanguage =
          sender === "User A" ? languageB : languageA;
        scheduleTranslation(
          sender,
          latest.text,
          latest.sourceLanguage,
          targetLanguage,
          latest.clientId,
        );
      }
    }
  }, [languageA, languageB, scheduleTranslation]);

  const sendTyping = useCallback(
    (channel: RealtimeChannel, payload: TypingPayload) => {
      const { sender, text, sourceLanguage } = payload;
      console.info(`[Supabase Realtime] Sending typing update from ${sender} (${text.length} characters)`);
      void channel
        .send({
          type: "broadcast",
          event: "typing",
          payload,
        })
        .then((result) => {
          if (result !== "ok") {
            console.error(`[Supabase Realtime] Typing broadcast was not acknowledged: ${result}`);
            setConnectionStatus("error");
            return;
          }

          console.info(`[Supabase Realtime] Typing broadcast acknowledged for ${sender}`);
        })
        .catch((error: unknown) => {
          console.error("[Supabase Realtime] Typing broadcast failed:", error);
          setConnectionStatus("error");
        });
    },
    [],
  );

  useEffect(() => {
    const pendingTyping = pendingTypingRef.current;
    const translationTimers = translationTimersRef.current;
    const translationRequestIds = translationRequestIdsRef.current;
    const latestRemoteText = latestRemoteTextRef.current;
    clientIdRef.current = crypto.randomUUID();
    const channel = supabase.channel("argument-room", {
      config: { broadcast: { self: true, ack: true } },
    });
    channelRef.current = channel;
    console.info("[Supabase Realtime] Connecting to channel: argument-room");

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!isTypingPayload(payload)) {
          console.error("Received an invalid typing broadcast payload.");
          return;
        }

        console.info(
          `[Supabase Realtime] Received typing update from ${payload.sender} (${payload.text.length} characters)`,
        );
        latestRemoteTextRef.current.set(payload.sender, {
          ...payload,
        });
        const updatePreview = payload.sender === "User A" ? setIncomingForB : setIncomingForA;
        const isEmpty = !payload.text.trim();
        updatePreview({
          sourceText: payload.text,
          translatedText: "",
          sourceLanguage: payload.sourceLanguage,
          targetLanguage: payload.targetLanguage,
          status: isEmpty ? "waiting" : "translating",
        });
        if (!isEmpty && payload.clientId === clientIdRef.current) {
          scheduleTranslationRef.current(
            payload.sender,
            payload.text,
            payload.sourceLanguage,
            payload.targetLanguage,
            payload.clientId,
          );
        }
      })
      .on("broadcast", { event: "translation" }, ({ payload }) => {
        if (!isTranslationPayload(payload)) {
          console.error("[Supabase Realtime] Received an invalid translation payload.");
          return;
        }

        const latest = latestRemoteTextRef.current.get(payload.sender);
        if (
          !latest ||
          latest.text !== payload.text ||
          latest.clientId !== payload.clientId ||
          latest.sourceLanguage !== payload.sourceLanguage
        ) {
          return;
        }

        const updatePreview = payload.sender === "User A" ? setIncomingForB : setIncomingForA;
        updatePreview({
          sourceText: payload.text,
          translatedText: payload.translatedText,
          sourceLanguage: payload.sourceLanguage,
          targetLanguage: payload.targetLanguage,
          status: "translated",
        });
      })
      .on("broadcast", { event: "translation-error" }, ({ payload }) => {
        if (!isTranslationErrorPayload(payload)) {
          console.error("[Supabase Realtime] Received an invalid translation error payload.");
          return;
        }

        const latest = latestRemoteTextRef.current.get(payload.sender);
        if (
          !latest ||
          latest.text !== payload.text ||
          latest.clientId !== payload.clientId ||
          latest.sourceLanguage !== payload.sourceLanguage
        ) {
          return;
        }

        const updatePreview = payload.sender === "User A" ? setIncomingForB : setIncomingForA;
        updatePreview({
          sourceText: payload.text,
          translatedText: "",
          sourceLanguage: payload.sourceLanguage,
          targetLanguage: payload.targetLanguage,
          status: "error",
          error: payload.error,
        });
      })
      .subscribe((status, error) => {
        console.info(`[Supabase Realtime] Channel status: ${status}`);
        if (status === "SUBSCRIBED") {
          channelReadyRef.current = true;
          setConnectionStatus("connected");
          console.info("[Supabase Realtime] Connected and subscribed to argument-room");

          for (const [sender, pending] of pendingTyping) {
            sendTyping(channel, pending);
          }
          pendingTyping.clear();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          channelReadyRef.current = false;
          setConnectionStatus("error");
          console.error(`[Supabase Realtime] Subscription failed: ${status}`, error);
        } else if (status === "CLOSED") {
          channelReadyRef.current = false;
          setConnectionStatus("connecting");
        }
      });

    return () => {
      channelReadyRef.current = false;
      channelRef.current = null;
      clientIdRef.current = null;
      pendingTyping.clear();
      for (const timer of translationTimers.values()) {
        clearTimeout(timer);
      }
      translationTimers.clear();
      translationRequestIds.clear();
      latestRemoteText.clear();
      console.info("[Supabase Realtime] Removing channel: argument-room");
      void supabase.removeChannel(channel);
    };
  }, [sendTyping]);

  const broadcastTyping = (
    sender: Speaker,
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ) => {
    const clientId = clientIdRef.current;
    if (!clientId) return;

    const payload: TypingPayload = {
      sender,
      text,
      sourceLanguage,
      targetLanguage,
      clientId,
    };
    const channel = channelRef.current;
    if (!channel || !channelReadyRef.current) {
      pendingTypingRef.current.set(sender, payload);
      return;
    }

    sendTyping(channel, payload);
  };

  const swapLanguages = () => {
    setLanguageA(languageB);
    setLanguageB(languageA);
  };

  return (
    <main className={`conversation-backdrop theme-${theme} min-h-screen px-4 py-5 text-foreground transition-colors duration-500 sm:px-8 sm:py-8`}>
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-7xl flex-col sm:min-h-[calc(100svh-4rem)]">
        <header className="glass-toolbar mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-3 sm:px-5">
          <Link className="group flex items-center gap-3" to="/" aria-label="CrossTalk home">
            <span className="brand-mark grid size-10 place-items-center rounded-xl transition-transform duration-300 group-hover:rotate-6">
              <AudioLines className="size-5" />
            </span>
            <span className="text-[15px] font-semibold tracking-[0.02em]">crosstalk<span className="brand-period">.</span></span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`room-status flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-[10px] font-semibold tracking-[0.08em] sm:text-xs ${connectionStatus === "error" ? "status-error" : ""}`}>
              <span className={`status-dot ${connectionStatus === "connecting" ? "is-connecting" : ""}`} />
              <span aria-live="polite">
                {connectionStatus === "connected"
                  ? "LIVE BROADCAST"
                  : connectionStatus === "error"
                    ? "CONNECTION ERROR"
                    : "CONNECTING…"}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              className="size-10 rounded-full border-border/80 bg-background/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" aria-label="Swap languages" title="Swap languages" onClick={swapLanguages} className="size-10 rounded-full border-border/80 bg-background/50 transition-all duration-300 hover:-translate-y-0.5 hover:rotate-180 hover:shadow-md">
              <ArrowDownUp className="size-4" />
            </Button>
          </div>
        </header>

        <div className="page-intro mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div className="animate-rise">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Radio className="size-3.5 text-primary" />
              <span>TWO SIDES · ONE CONVERSATION</span>
            </div>
            <h1 className="page-title">Say it like you mean it.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              A little more understanding starts with being heard.
            </p>
          </div>
          <div className="preview-pill flex items-center gap-2 rounded-full border border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <span>Groq AI translation</span>
          </div>
        </div>

        <div className="language-flow mb-4 hidden items-center justify-center gap-3 text-xs text-muted-foreground sm:flex" aria-hidden="true">
          <span>{languageA}</span>
          <span className="flow-line" />
          <ArrowDownUp className="size-3.5" />
          <span className="flow-line" />
          <span>{languageB}</span>
        </div>

        <div className="conversation-grid glass-frame grid flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border/80 shadow-conversation md:grid-cols-2">
          <SpeakerPanel
            side="a"
            name="User A"
            initials="A"
            language={languageA}
            incomingFrom="User B"
            incomingText={incomingForA}
            draft={draftA}
            onLanguageChange={setLanguageA}
            onDraftChange={(text, sourceLanguage) => {
              setDraftA(text);
              broadcastTyping("User A", text, sourceLanguage, languageB);
            }}
            onRetryTranslation={() => retryTranslation("User B")}
            canRetryTranslation={
              latestRemoteTextRef.current.get("User B")?.clientId === clientIdRef.current
            }
          />
          <SpeakerPanel
            side="b"
            name="User B"
            initials="B"
            language={languageB}
            incomingFrom="User A"
            incomingText={incomingForB}
            draft={draftB}
            onLanguageChange={setLanguageB}
            onDraftChange={(text, sourceLanguage) => {
              setDraftB(text);
              broadcastTyping("User B", text, sourceLanguage, languageA);
            }}
            onRetryTranslation={() => retryTranslation("User A")}
            canRetryTranslation={
              latestRemoteTextRef.current.get("User A")?.clientId === clientIdRef.current
            }
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pt-5 text-[11px] text-muted-foreground/80">
          <span className="flex items-center gap-2"><span className="footer-sparkle"><Sparkles className="size-3" /></span> Made for conversations that matter.</span>
          <span>Live typing via Supabase · text is sent to Groq after you pause typing</span>
        </footer>
      </div>
    </main>
  );
}
