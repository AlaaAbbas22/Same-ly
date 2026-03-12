"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import SurahVerseSelector from "@/components/SurahVerseSelector";
import { Shuffle, Plus, Trash2, Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import surahData from "@/lib/surah.json";

function splitWords(text) {
  if (!text || typeof text !== "string") return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

function isSurahGuessCorrect(selectedSurahNum, result) {
  const num = selectedSurahNum === "" || selectedSurahNum == null ? NaN : parseInt(selectedSurahNum, 10);
  return Number.isInteger(num) && num >= 1 && num <= 114 && num === result.surah;
}

function VerseRevealCard({
  result,
  revealedCount,
  onReveal,
  surahCorrect,
  surahGuess,
  onSurahGuessChange,
  onCheckSurahGuess,
  checkFeedback,
  onNextVerse,
  nextVerseLoading,
  surahList,
}) {
  const wordsArabic = useMemo(() => splitWords(result.arabic), [result.arabic]);
  const wordsEnglish = useMemo(() => splitWords(result.english), [result.english]);
  const maxWords = Math.max(wordsArabic.length, wordsEnglish.length, 1);
  const cappedReveal = Math.min(revealedCount, maxWords);
  const allRevealed = cappedReveal >= maxWords;

  const renderLine = (words, revealed, dir, textClass) => (
    <div dir={dir} className={textClass}>
      {words.flatMap((word, i) => {
        const node =
          i < revealed ? (
            <span key={i}>{word}</span>
          ) : (
            <span
              key={i}
              className="inline-block min-w-[1.25em] mx-px border-b border-slate-400 dark:border-slate-500"
              aria-hidden
            />
          );
        return i === 0 ? [node] : [<span key={`s-${i}`}> </span>, node];
      })}
    </div>
  );

  return (
    <Card className="shadow-md border-emerald-200 dark:border-emerald-800 overflow-hidden">
      <CardHeader className="bg-emerald-50/80 dark:bg-emerald-950/50 border-b border-emerald-100 dark:border-emerald-900">
        <CardTitle className="text-lg text-emerald-900 dark:text-emerald-100">
          {surahCorrect ? (
            <> {result.surahName} ({result.surahNameArabic}) </>
          ) : (
            <>Guess the surah</>
          )}
        </CardTitle>
        <CardDescription className="text-emerald-700 dark:text-emerald-300">
          Verse {result.verse} — Reveal words one at a time, then guess the surah
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {renderLine(
          wordsArabic,
          cappedReveal,
          "rtl",
          "text-2xl sm:text-3xl text-slate-800 dark:text-slate-200 leading-loose text-center"
        )}
        {renderLine(
          wordsEnglish,
          cappedReveal,
          "ltr",
          "text-slate-600 dark:text-slate-300 text-center text-lg leading-relaxed"
        )}

        {/* Surah guess */}
        {!surahCorrect && (
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1 space-y-1 min-w-0 max-w-sm">
              <Label className="text-sm font-medium">Which surah is this?</Label>
              <Select
                value={surahGuess}
                onValueChange={(v) => {
                  onSurahGuessChange(v);
                }}
              >
                <SelectTrigger id="surah-guess" className="w-full">
                  <SelectValue placeholder="Select surah…" />
                </SelectTrigger>
                <SelectContent>
                  {(surahList || []).map((s, index) => {
                    const num = index + 1;
                    return (
                      <SelectItem key={num} value={String(num)}>
                        {num}. {s.surahName} ({s.surahNameArabic})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={onCheckSurahGuess} disabled={!surahGuess}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Check
            </Button>
          </div>
        )}
        {checkFeedback === "correct" && (
          <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Correct! This is Surah {result.surah} — {result.surahName} ({result.surahNameArabic}).
          </p>
        )}
        {checkFeedback === "wrong" && (
          <p className="text-amber-600 dark:text-amber-400">
            Not quite. Try again — you can guess multiple times.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="button"
            onClick={onReveal}
            disabled={allRevealed}
            variant={allRevealed ? "secondary" : "default"}
          >
            <Eye className="mr-2 h-4 w-4" />
            {allRevealed ? "Fully revealed" : "Reveal next word"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onNextVerse}
            disabled={nextVerseLoading}
          >
            {nextVerseLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading…
              </span>
            ) : (
              <>
                Next verse <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        {allRevealed && surahCorrect && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            — {result.surahName}, {result.verse}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const defaultInterval = () => ({ start: { surah: "", verse: "1" }, end: { surah: "", verse: "1" } });

export default function RandomVersePage() {
  const [intervals, setIntervals] = useState([defaultInterval()]);
  const [result, setResult] = useState(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [surahGuess, setSurahGuess] = useState("");
  const [surahCorrect, setSurahCorrect] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState(null); // null | "correct" | "wrong"
  const [loading, setLoading] = useState(false);
  const [nextVerseLoading, setNextVerseLoading] = useState(false);
  const [error, setError] = useState(null);

  const setIntervalAt = (index, updater) => {
    setIntervals((prev) => {
      const next = [...prev];
      next[index] = typeof updater === "function" ? updater(next[index]) : updater;
      return next;
    });
  };

  const addInterval = () => setIntervals((prev) => [...prev, defaultInterval()]);
  const removeInterval = (index) => {
    if (intervals.length <= 1) return;
    setIntervals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = intervals.every(
      (i) => i.start?.surah && i.end?.surah
    );
    if (!valid) {
      setError("Please set start and end for each interval.");
      return;
    }
    setError(null);
    setResult(null);
    setRevealedCount(0);
    setSurahGuess("");
    setSurahCorrect(false);
    setCheckFeedback(null);
    setLoading(true);
    try {
      const body = buildIntervalsBody(intervals);
      const res = await fetch("/api/random-verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to get random verse.");
        return;
      }
      setResult(data);
      setRevealedCount(0);
      setSurahGuess("");
      setSurahCorrect(false);
      setCheckFeedback(null);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildIntervalsBody = (ints) => ({
    intervals: ints.map((i) => ({
      startSurah: Number(i.start.surah),
      startVerse: Number(i.start.verse),
      endSurah: Number(i.end.surah),
      endVerse: Number(i.end.verse),
    })),
  });

  const fetchNextVerse = async () => {
    if (!result || !intervals.length) return;
    setNextVerseLoading(true);
    setCheckFeedback(null);
    try {
      const body = buildIntervalsBody(intervals);
      const res = await fetch("/api/random-verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to get next verse.");
        return;
      }
      setResult(data);
      setRevealedCount(0);
      setSurahGuess("");
      setSurahCorrect(false);
      setCheckFeedback(null);
      setError(null);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setNextVerseLoading(false);
    }
  };

  const handleCheckSurahGuess = () => {
    if (!result) return;
    if (isSurahGuessCorrect(surahGuess, result)) {
      setSurahCorrect(true);
      setCheckFeedback("correct");
    } else {
      setCheckFeedback("wrong");
    }
  };

  const canSubmit = intervals.some(
    (i) => i.start?.surah && i.end?.surah
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl mx-auto p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Random Verse
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Add one or more ranges. One random verse will be picked from the union of all ranges.
          </p>
        </div>

        <Card className="mb-8 shadow-sm border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Intervals</CardTitle>
            <CardDescription>
              Each row is one range (start → end). Overlapping ranges are merged; one verse is chosen at random from the combined set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {intervals.map((interval, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-4 items-start rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4"
                >
                  <div className="flex-1 grid gap-4 sm:grid-cols-2 w-full">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start</Label>
                      <SurahVerseSelector
                        type="start"
                        value={interval.start}
                        onChange={(v) => setIntervalAt(index, (prev) => ({ ...prev, start: v }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End</Label>
                      <SurahVerseSelector
                        type="end"
                        value={interval.end}
                        onChange={(v) => setIntervalAt(index, (prev) => ({ ...prev, end: v }))}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInterval(index)}
                    disabled={intervals.length <= 1}
                    className="shrink-0 text-slate-500 hover:text-red-600"
                    aria-label="Remove interval"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addInterval}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add interval
              </Button>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Picking…
                  </span>
                ) : (
                  <>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Get random verse
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <VerseRevealCard
            result={result}
            revealedCount={revealedCount}
            onReveal={() => setRevealedCount((c) => c + 1)}
            surahCorrect={surahCorrect}
            surahGuess={surahGuess}
            onSurahGuessChange={(v) => {
              setSurahGuess(v ?? "");
              setCheckFeedback(null);
            }}
            onCheckSurahGuess={handleCheckSurahGuess}
            checkFeedback={checkFeedback}
            onNextVerse={fetchNextVerse}
            nextVerseLoading={nextVerseLoading}
            surahList={surahData}
          />
        )}
      </div>
    </div>
  );
}
