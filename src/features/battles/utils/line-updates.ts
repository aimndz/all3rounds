import type {
  BattleData,
  BattleLine,
} from "@/features/battles/hooks/use-battle-data";

export type BattleLineUpdate = {
  content?: string;
  round_number?: number | null;
  emcee_id?: string | null;
  speaker_ids?: string[] | null;
};

type BattleParticipant = BattleData["participants"][number];
type BattleEmcee = NonNullable<BattleParticipant["emcee"]>;

function hasOwn<T extends object>(value: T, key: keyof BattleLineUpdate) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildEmceeLookup(participants: BattleData["participants"] = []) {
  const lookup = new Map<string, BattleEmcee>();

  participants.forEach((participant) => {
    if (participant.emcee) {
      lookup.set(participant.emcee.id, participant.emcee);
    }
  });

  return lookup;
}

function resolveLineSpeakers(
  line: BattleLine,
  updates: BattleLineUpdate,
  emceeLookup: Map<string, BattleEmcee>,
) {
  if (hasOwn(updates, "speaker_ids")) {
    const nextSpeakerIds = updates.speaker_ids ?? [];
    const nextEmcees = nextSpeakerIds
      .map((speakerId) => emceeLookup.get(speakerId))
      .filter((emcee): emcee is BattleEmcee => Boolean(emcee));
    const nextEmceeId =
      hasOwn(updates, "emcee_id") && updates.emcee_id !== undefined
        ? updates.emcee_id
        : nextSpeakerIds[0] ?? null;

    return {
      emcee: nextEmceeId ? emceeLookup.get(nextEmceeId) ?? null : null,
      emcees: nextEmcees,
    };
  }

  if (hasOwn(updates, "emcee_id")) {
    const nextEmcee =
      updates.emcee_id && updates.emcee_id !== undefined
        ? emceeLookup.get(updates.emcee_id) ?? null
        : null;

    return {
      emcee: nextEmcee,
      emcees: nextEmcee ? [nextEmcee] : [],
    };
  }

  return {
    emcee: line.emcee,
    emcees: line.emcees,
  };
}

export function applyLineUpdatesToBattleData(
  battleData: BattleData | null,
  lineIds: Iterable<number>,
  updates: BattleLineUpdate,
) {
  if (!battleData) {
    return null;
  }

  const selectedLineIds = new Set(lineIds);
  if (selectedLineIds.size === 0) {
    return battleData;
  }

  const emceeLookup = buildEmceeLookup(battleData.participants);
  let touched = false;

  const nextLines = battleData.lines.map((line) => {
    if (!selectedLineIds.has(line.id)) {
      return line;
    }

    touched = true;

    return {
      ...line,
      ...(hasOwn(updates, "content") ? { content: updates.content ?? "" } : {}),
      ...(hasOwn(updates, "round_number")
        ? { round_number: updates.round_number ?? null }
        : {}),
      ...resolveLineSpeakers(line, updates, emceeLookup),
    };
  });

  if (!touched) {
    return battleData;
  }

  return {
    ...battleData,
    lines: nextLines,
  };
}

export function removeLinesFromBattleData(
  battleData: BattleData | null,
  lineIds: Iterable<number>,
) {
  if (!battleData) {
    return null;
  }

  const selectedLineIds = new Set(lineIds);
  if (selectedLineIds.size === 0) {
    return battleData;
  }

  const nextLines = battleData.lines.filter((line) => !selectedLineIds.has(line.id));
  if (nextLines.length === battleData.lines.length) {
    return battleData;
  }

  const removedCount = battleData.lines.length - nextLines.length;
  const pagination = battleData.lines_pagination;

  return {
    ...battleData,
    lines: nextLines,
    lines_pagination: pagination
      ? {
          ...pagination,
          loaded: nextLines.length,
          total: Math.max(pagination.total - removedCount, pagination.offset + nextLines.length),
          has_more:
            pagination.offset + nextLines.length <
            Math.max(
              pagination.total - removedCount,
              pagination.offset + nextLines.length,
            ),
        }
      : pagination,
  };
}
