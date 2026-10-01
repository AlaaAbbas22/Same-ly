"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

export default function SurahVerseSelector({
  type, // "start" or "end"
  value,
  onChange,
  required = false,
}) {
  const [surahs, setSurahs] = useState([]);
  const [maxVerses, setMaxVerses] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surahOpen, setSurahOpen] = useState(false);

  // Fetch all surahs on component mount
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          "https://quranapi.pages.dev/api/surah.json"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch surahs");
        }

        const data = await response.json();
        // add index to each surah
        setSurahs(data.map((surah, index) => ({
          ...surah,
          surahNo: index+1
        })));
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

    const selectedSurah = surahs.find(
      (s) => s.surahNo === parseInt(value.surah)
    );

    if (selectedSurah) {
      setMaxVerses(selectedSurah.totalAyah);
    } else {
      const fetchSurahDetails = async () => {
        try {
          const response = await fetch(
            `https://quranapi.pages.dev/api/${value.surah}.json`
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch details for surah ${value.surah}`
            );
          }

          const data = await response.json();
          setMaxVerses(data.totalAyah);
        } catch (err) {
          console.error(
            `Error fetching surah ${value.surah} details:`,
            err
          );
        }
      };

      fetchSurahDetails();
    }
  }, [value?.surah, surahs]);

  const handleSurahChange = (surahNo) => {
    onChange({
      ...value,
      surah: surahNo,
      verse: 1,
    });
  };

  const handleVerseChange = (verse) => {
    onChange({
      ...value,
      verse: parseInt(verse),
    });
  };
  // add index to the selectedSurah
  const selectedSurah = surahs.find(
    (surah) => surah.surahNo === parseInt(value?.surah)
  );

  return (
    <div className="space-y-4">
      {/* Surah */}
      <div className="space-y-2">
        <Label
          htmlFor={`${type}-surah`}
          className="text-sm font-medium"
        >
          {type === "start" ? "Start Surah" : "End Surah"}
        </Label>

        <Popover open={surahOpen} onOpenChange={setSurahOpen}>
          <PopoverTrigger asChild>
            <button
              id={`${type}-surah`}
              type="button"
              disabled={loading}
              className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
            >
              <span className="truncate">
                {selectedSurah
                  ? `${selectedSurah.surahNo}. ${selectedSurah.surahName} (${selectedSurah.surahNameArabic})`
                  : loading
                    ? "Loading..."
                    : "Select Surah"}
              </span>

              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[300px] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search Surah..." />

              <CommandList>
                <CommandEmpty>
                  No Surah found.
                </CommandEmpty>

                <CommandGroup>
                  {surahs.map((surah, index) => {
                    const surahNumber = surah.surahNo?.toString() || (index + 1).toString();
                    const isSelected =
                      value?.surah?.toString() === surahNumber;

                    return (
                      <CommandItem
                        key={surah.surahNo}
                        value={`${surah.surahName} ${surah.surahNameArabic} ${surah.surahNo}`}
                        onSelect={() => {
                          handleSurahChange(surahNumber);
                          setSurahOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            isSelected
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />

                        <span className="truncate">
                          {surah.surahNo}. {surah.surahName} (
                          {surah.surahNameArabic})
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Verse */}
      <div className="space-y-2">
        <Label
          htmlFor={`${type}-verse`}
          className="text-sm font-medium"
        >
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
              <SelectItem
                key={i + 1}
                value={(i + 1).toString()}
              >
                {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}