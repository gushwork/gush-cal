"use client";

import { Button } from "@/components/ui/button";

export type TeamOption = {
  id: string;
  name: string;
  slug: string;
};

type TeamPickerProps = {
  teams: TeamOption[];
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
};

export function TeamPicker({ teams, selectedTeamId, onSelect }: TeamPickerProps) {
  return (
    <div className="space-y-4" data-testid="team-picker">
      <p className="text-sm text-neutral-600">
        Choose which team you want to book with.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {teams.map((team) => {
          const selected = team.id === selectedTeamId;
          return (
            <li key={team.id}>
              <button
                type="button"
                onClick={() => onSelect(team.id)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-neutral-100 bg-white hover:bg-neutral-25"
                }`}
              >
                <span className="block font-grotesk text-base font-medium text-neutral-900">
                  {team.name}
                </span>
                <span className="text-sm text-neutral-500">{team.slug}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button type="button" disabled={!selectedTeamId} className="sr-only" aria-hidden>
        Continue
      </Button>
    </div>
  );
}
