export type Participant = {
  label: string;
  emcee: { id: string; name: string; aka?: string[] } | null;
};

export type GroupedParticipant = {
  label: string;
  emcees: { id: string; name: string }[];
};

/**
 * Reorders participants to match the slot order encoded in the battle title.
 * Matches against both current name and aka aliases, so renamed/merged emcees
 * are still placed on the correct team.
 * Unmatched participants are appended at the end unchanged.
 */
export function sortParticipantsByTitle<T extends Participant>(
  participants: T[],
  title: string,
): T[] {
  const titleNames = title
    .split(/\s+vs\.?\s+/i)
    .flatMap((side) => side.split(/\s*[\/&]\s*|\s+and\s+/i))
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  if (titleNames.length === 0) return participants;

  const used = new Set<number>();
  const sorted: T[] = [];

  for (const titleName of titleNames) {
    let bestIdx = -1;
    let bestScore = Infinity;
    participants.forEach((p, idx) => {
      if (used.has(idx) || !p.emcee) return;
      const names = [p.emcee.name, ...(p.emcee.aka ?? [])].map((n) =>
        n.toLowerCase(),
      );
      const score = names.includes(titleName)
        ? 0
        : names.some((n) => n.startsWith(titleName) || titleName.startsWith(n))
          ? 1
          : Infinity;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx !== -1) {
      used.add(bestIdx);
      sorted.push(participants[bestIdx]);
    }
  }

  participants.forEach((p, idx) => {
    if (!used.has(idx)) sorted.push(p);
  });

  return sorted;
}

export function groupParticipants(
  participants?: Participant[],
): GroupedParticipant[] {
  if (!participants || participants.length === 0) return [];

  const groups: GroupedParticipant[] = [];

  const distinctLabels = new Set(
    participants.map((p) => p.label).filter(Boolean),
  );
  const hasSharedLabels =
    distinctLabels.size < participants.filter((p) => p.label).length;

  if (!hasSharedLabels && participants.length === 4) {
    return [
      {
        label: "Team 1",
        emcees: participants
          .slice(0, 2)
          .map((p) => p.emcee)
          .filter((e): e is { id: string; name: string } => !!e),
      },
      {
        label: "Team 2",
        emcees: participants
          .slice(2, 4)
          .map((p) => p.emcee)
          .filter((e): e is { id: string; name: string } => !!e),
      },
    ];
  }

  if (!hasSharedLabels && participants.length === 6) {
    return [
      {
        label: "Team 1",
        emcees: participants
          .slice(0, 3)
          .map((p) => p.emcee)
          .filter((e): e is { id: string; name: string } => !!e),
      },
      {
        label: "Team 2",
        emcees: participants
          .slice(3, 6)
          .map((p) => p.emcee)
          .filter((e): e is { id: string; name: string } => !!e),
      },
    ];
  }

  participants.forEach((p) => {
    if (!p.emcee) return;
    let group = groups.find((g) => g.label === p.label);
    if (!group) {
      group = { label: p.label || "Individual", emcees: [] };
      groups.push(group);
    }
    group.emcees.push(p.emcee);
  });

  return groups;
}
