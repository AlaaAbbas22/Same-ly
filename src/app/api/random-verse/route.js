import { NextResponse } from 'next/server';
import surahData from '@/lib/surah.json';

const QURAN_API_BASE = 'https://quranapi.pages.dev/api';

/** Build list of { surah, verse } in [startSurah:startVerse, endSurah:endVerse] (inclusive). */
function versesInRange(startSurah, startVerse, endSurah, endVerse) {
  const list = [];
  for (let s = startSurah; s <= endSurah; s++) {
    const totalAyah = surahData[s - 1]?.totalAyah ?? 0;
    const startV = s === startSurah ? startVerse : 1;
    const endV = s === endSurah ? endVerse : totalAyah;
    for (let v = startV; v <= endV; v++) {
      list.push({ surah: s, verse: v });
    }
  }
  return list;
}

/** Validate one interval and return verses (or throw via NextResponse). */
function validateInterval(startSurah, startVerse, endSurah, endVerse) {
  if (
    !Number.isInteger(startSurah) || startSurah < 1 || startSurah > 114 ||
    !Number.isInteger(startVerse) || startVerse < 1 ||
    !Number.isInteger(endSurah) || endSurah < 1 || endSurah > 114 ||
    !Number.isInteger(endVerse) || endVerse < 1
  ) {
    return { error: 'Invalid range. Each interval needs startSurah, startVerse, endSurah, endVerse (1–114 for surahs, 1+ for verses).' };
  }
  const startInfo = surahData[startSurah - 1];
  const endInfo = surahData[endSurah - 1];
  if (!startInfo || !endInfo) {
    return { error: 'Invalid surah number.' };
  }
  if (startVerse > startInfo.totalAyah) {
    return { error: `Start verse must be 1–${startInfo.totalAyah} for surah ${startSurah}.` };
  }
  if (endVerse > endInfo.totalAyah) {
    return { error: `End verse must be 1–${endInfo.totalAyah} for surah ${endSurah}.` };
  }
  if (startSurah > endSurah || (startSurah === endSurah && startVerse > endVerse)) {
    return { error: 'Start must be before or equal to end (surah and verse) in each interval.' };
  }
  return { verses: versesInRange(startSurah, startVerse, endSurah, endVerse) };
}

/** Union of verses from multiple intervals (deduplicated by surah:verse). */
function unionVerses(intervals) {
  const byKey = new Map();
  for (const { startSurah, startVerse, endSurah, endVerse } of intervals) {
    const result = validateInterval(startSurah, startVerse, endSurah, endVerse);
    if (result.error) return result;
    for (const v of result.verses) {
      byKey.set(`${v.surah}:${v.verse}`, v);
    }
  }
  return { verses: [...byKey.values()] };
}

async function pickAndFetchVerse(verses) {
  if (!verses.length) {
    return NextResponse.json(
      { error: 'No verses in the given intervals (or intervals were invalid).' },
      { status: 400 }
    );
  }
  const chosen = verses[Math.floor(Math.random() * verses.length)];
  const res = await fetch(`${QURAN_API_BASE}/${chosen.surah}.json`);
  if (!res.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch verse text from Quran API.' },
      { status: 502 }
    );
  }
  const data = await res.json();
  const english = data.english?.[chosen.verse - 1] ?? '';
  const arabic = data.arabic1?.[chosen.verse - 1] ?? data.arabic2?.[chosen.verse - 1] ?? '';
  const surahName = data.surahName ?? surahData[chosen.surah - 1]?.surahName ?? '';
  const surahNameArabic = data.surahNameArabic ?? surahData[chosen.surah - 1]?.surahNameArabic ?? '';
  return NextResponse.json({
    surah: chosen.surah,
    verse: chosen.verse,
    surahName,
    surahNameArabic,
    english,
    arabic,
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startSurah = parseInt(searchParams.get('startSurah'), 10);
    const startVerse = parseInt(searchParams.get('startVerse'), 10);
    const endSurah = parseInt(searchParams.get('endSurah'), 10);
    const endVerse = parseInt(searchParams.get('endVerse'), 10);

    const result = validateInterval(startSurah, startVerse, endSurah, endVerse);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const chosen = result.verses[Math.floor(Math.random() * result.verses.length)];

    const res = await fetch(`${QURAN_API_BASE}/${chosen.surah}.json`);
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch verse text from Quran API.' },
        { status: 502 }
      );
    }
    const data = await res.json();
    const english = data.english?.[chosen.verse - 1] ?? '';
    const arabic = data.arabic1?.[chosen.verse - 1] ?? data.arabic2?.[chosen.verse - 1] ?? '';
    const surahName = data.surahName ?? surahData[chosen.surah - 1]?.surahName ?? '';
    const surahNameArabic = data.surahNameArabic ?? surahData[chosen.surah - 1]?.surahNameArabic ?? '';

    return NextResponse.json({
      surah: chosen.surah,
      verse: chosen.verse,
      surahName,
      surahNameArabic,
      english,
      arabic,
    });
  } catch (err) {
    console.error('Random verse API error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}

/** POST with body { intervals: [ { startSurah, startVerse, endSurah, endVerse }, ... ] } — one random verse from union. */
export async function POST(request) {
  try {
    const body = await request.json();
    const intervals = body?.intervals;
    if (!Array.isArray(intervals) || intervals.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include an array "intervals" with at least one { startSurah, startVerse, endSurah, endVerse }.' },
        { status: 400 }
      );
    }
    const union = unionVerses(intervals);
    if (union.error) {
      return NextResponse.json({ error: union.error }, { status: 400 });
    }
    return pickAndFetchVerse(union.verses);
  } catch (err) {
    console.error('Random verse API error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
