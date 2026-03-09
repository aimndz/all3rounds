export type GroupedParticipant = {
  label: string;
  emcees: { id: string; name: string }[];
};

/**
 * Groups battle participants into logical teams based on their count or labels.
 * 
 * Logic:
 * 1. If we have exactly 4 or 6 participants and they don't already share labels,
 *    we force-group them into 2 teams (typical of 2v2 or 3v3 battles).
 * 2. Otherwise, we group by their diarization label (e.g., "SPEAKER_00").
 */
export function groupParticipants(
  participants?: {
    label: string;
    emcee: { id: string; name: string } | null;
  }[]
): GroupedParticipant[] {
  if (!participants || participants.length === 0) return [];

  const groups: GroupedParticipant[] = [];
  
  // Check if labels are already shared (indicating they are already grouped)
  const distinctLabels = new Set(participants.map(p => p.label).filter(Boolean));
  const hasSharedLabels = distinctLabels.size < participants.filter(p => p.label).length;

  // Force-group for standard 2v2 (4 emcees) or 3v3 (6 emcees) if they are listed individually
  if (!hasSharedLabels && participants.length === 4) {
    return [
      { 
        label: 'Team 1', 
        emcees: participants.slice(0, 2).map(p => p.emcee).filter((e): e is { id: string; name: string } => !!e) 
      },
      { 
        label: 'Team 2', 
        emcees: participants.slice(2, 4).map(p => p.emcee).filter((e): e is { id: string; name: string } => !!e) 
      }
    ];
  } 
  
  if (!hasSharedLabels && participants.length === 6) {
    return [
      { 
        label: 'Team 1', 
        emcees: participants.slice(0, 3).map(p => p.emcee).filter((e): e is { id: string; name: string } => !!e) 
      },
      { 
        label: 'Team 2', 
        emcees: participants.slice(3, 6).map(p => p.emcee).filter((e): e is { id: string; name: string } => !!e) 
      }
    ];
  }

  // Standard grouping by label
  participants.forEach(p => {
    if (!p.emcee) return;
    let group = groups.find(g => g.label === p.label);
    if (!group) {
        group = { label: p.label || 'Individual', emcees: [] };
        groups.push(group);
    }
    group.emcees.push(p.emcee);
  });

  return groups;
}
