"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function SurahVerseSelector({ 
  type, // "start" or "end"
  value, 
  onChange,
  required = false
}) {
  const [surahs, setSurahs] = useState([]);
  const [maxVerses, setMaxVerses] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all surahs on component mount
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        setLoading(true);
        const response = await fetch("https://quranapi.pages.dev/api/surah.json");
        if (!response.ok) {
          throw new Error("Failed to fetch surahs");
        }
        const data = await response.json();
        setSurahs(data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching surahs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurahs();
  }, []);

  // Update max verses when surah changes
  useEffect(() => {
    if (!value?.surah) return;
    
    const selectedSurah = surahs.find(s => s.surahNo === parseInt(value.surah) || s.surahNo === parseInt(value.surah));
    if (selectedSurah) {
      setMaxVerses(selectedSurah.totalAyah);
    } else {
      // If we don't have the surah info yet, fetch it directly
      const fetchSurahDetails = async () => {
        try {
          const response = await fetch(`https://quranapi.pages.dev/api/${value.surah}.json`);
          if (!response.ok) {
            throw new Error(`Failed to fetch details for surah ${value.surah}`);
          }
          const data = await response.json();
          setMaxVerses(data.totalAyah);
        } catch (err) {
          console.error(`Error fetching surah ${value.surah} details:`, err);
        }
      };
      
      fetchSurahDetails();
    }
  }, [value?.surah, surahs]);

  const handleSurahChange = (surahNo) => {
    onChange({
      ...value,
      surah: surahNo,
      verse: 1 // Reset verse when surah changes
    });
  };

  const handleVerseChange = (verse) => {
    onChange({
      ...value,
      verse: parseInt(verse)
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${type}-surah`} className="text-sm font-medium">
          {type === "start" ? "Start Surah" : "End Surah"}
        </Label>
        <Select 
          value={value?.surah?.toString() || ""} 
          onValueChange={handleSurahChange}
          disabled={loading}
        >
          <SelectTrigger id={`${type}-surah`}>
            <SelectValue placeholder="Select Surah" />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value=" " disabled>Loading...</SelectItem>
            ) : error ? (
              <SelectItem value=" " disabled>Error loading surahs</SelectItem>
            ) : (
              surahs.map((surah, index) => (
                <SelectItem key={surah.surahNo || index + 1} value={(surah.surahNo || index + 1).toString()}>
                  {surah.surahNo || index + 1}. {surah.surahName} ({surah.surahNameArabic})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${type}-verse`} className="text-sm font-medium">
          {type === "start" ? "Start Verse" : "End Verse"}
        </Label>
        <Select 
          value={value?.verse?.toString() || "1"} 
          onValueChange={handleVerseChange}
          disabled={!value?.surah}
        >
          <SelectTrigger id={`${type}-verse`}>
            <SelectValue placeholder="Select Verse" />
          </SelectTrigger>
          <SelectContent>
            {[...Array(maxVerses)].map((_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}