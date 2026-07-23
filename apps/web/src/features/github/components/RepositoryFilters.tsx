'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/forms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/forms/select';
import { Label } from '@/components/ui/label';

export type VisibilityFilter = 'all' | 'public' | 'private';

export interface RepositoryFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  visibility: VisibilityFilter;
  onVisibilityChange: (value: VisibilityFilter) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  languages: readonly string[];
}

const ALL_LANGUAGES = 'all';

/**
 * Controlled search + filter controls for the repository list. Presentation
 * only — all state lives in the parent importer. Every control is labelled
 * (CLAUDE.md §13.7).
 */
export function RepositoryFilters({
  query,
  onQueryChange,
  visibility,
  onVisibilityChange,
  language,
  onLanguageChange,
  languages,
}: RepositoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="repo-search" className="sr-only">
          Search repositories
        </Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="repo-search"
            type="search"
            placeholder="Search by name or description…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="w-36">
          <Label htmlFor="repo-visibility" className="sr-only">
            Filter by visibility
          </Label>
          <Select
            value={visibility}
            onValueChange={(value) => onVisibilityChange(value as VisibilityFilter)}
          >
            <SelectTrigger id="repo-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Label htmlFor="repo-language" className="sr-only">
            Filter by language
          </Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger id="repo-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_LANGUAGES}>All languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
