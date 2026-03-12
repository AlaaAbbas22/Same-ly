import { NextResponse } from 'next/server';
import surahData from '@/lib/surah.json';

const QURAN_API_BASE = 'https://quranapi.pages.dev/api';

/** Get the verse that comes immediately after (surah, verse) in Quran order. Returns null if at last verse. */
function getNextVerse(surah, verse) {
  const totalAyah = surahData[surah - 1]?.totalAyah ?? 0;
  if (verse < totalAyah) {
    return { surah, verse: verse + 1 };
  }
  if (surah < 114) {
    return { surah: surah + 1, verse: 1 };
  }
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surah = parseInt(searchParams.get('surah'), 10);
    const verse = parseInt(searchParams.get('verse'), 10);

    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(verse) || verse < 1) {
      return NextResponse.json(
        { error: 'Invalid verse. Provide surah (1–114) and verse (1+).' },
        { status: 400 }
      );
    }

    const totalAyah = surahData[surah - 1]?.totalAyah ?? 0;
    if (verse > totalAyah) {
      return NextResponse.json(
        { error: `Verse must be 1–${totalAyah} for surah ${surah}.` },
        { status: 400 }
      );
    }

    const next = getNextVerse(surah, verse);
    if (!next) {
      return NextResponse.json(
        { error: 'There is no verse after this one (end of the Quran).' },
        { status: 404 }
      );
    }

    const res = await fetch(`${QURAN_API_BASE}/${next.surah}.json`);
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch verse from Quran API.' },
        { status: 502 }
      );
    }
    const data = await res.json();
    const english = data.english?.[next.verse - 1] ?? '';
    const arabic = data.arabic1?.[next.verse - 1] ?? data.arabic2?.[next.verse - 1] ?? '';
    const surahName = data.surahName ?? surahData[next.surah - 1]?.surahName ?? '';
    const surahNameArabic = data.surahNameArabic ?? surahData[next.surah - 1]?.surahNameArabic ?? '';

    return NextResponse.json({
      surah: next.surah,
      verse: next.verse,
      surahName,
      surahNameArabic,
      english,
      arabic,
    });
  } catch (err) {
    console.error('Next verse API error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
