import { describe, it, expect } from "vitest";
import {
  groupParticipants,
  sortParticipantsByTitle,
} from "../participant-grouping";

describe("sortParticipantsByTitle", () => {
  const p = (id: string, name: string, aka: string[] = []) => ({
    label: "S" + id,
    emcee: { id, name, aka },
  });

  it("sorts 2v2 participants into title order", () => {
    const participants = [
      p("3", "Atoms"),
      p("4", "Cygnus"),
      p("1", "Negho G"),
      p("2", "Pamoso"),
    ];
    const result = sortParticipantsByTitle(
      participants,
      "Negho G / Pamoso vs Atoms / Cygnus",
    );
    expect(result.map((r) => r.emcee?.name)).toEqual([
      "Negho G",
      "Pamoso",
      "Atoms",
      "Cygnus",
    ]);
  });

  it("matches a merged emcee via aka", () => {
    // "Negho G" was merged into "Negho Gy" — the old name is now in aka[]
    const participants = [
      p("3", "Atoms"),
      p("4", "Cygnus"),
      p("1", "Negho Gy", ["Negho G"]),
      p("2", "Pamoso"),
    ];
    const result = sortParticipantsByTitle(
      participants,
      "Negho G / Pamoso vs Atoms / Cygnus",
    );
    expect(result.map((r) => r.emcee?.name)).toEqual([
      "Negho Gy",
      "Pamoso",
      "Atoms",
      "Cygnus",
    ]);
  });

  it("handles 1v1 titles", () => {
    const participants = [p("2", "Smugglaz"), p("1", "Loonie")];
    const result = sortParticipantsByTitle(participants, "Loonie vs Smugglaz");
    expect(result.map((r) => r.emcee?.name)).toEqual(["Loonie", "Smugglaz"]);
  });

  it("returns participants unchanged when title is empty", () => {
    const participants = [p("1", "A"), p("2", "B")];
    expect(sortParticipantsByTitle(participants, "")).toEqual(participants);
  });

  it("appends unmatched participants at the end", () => {
    const participants = [p("3", "Extra"), p("1", "A"), p("2", "B")];
    const result = sortParticipantsByTitle(participants, "A vs B");
    expect(result.map((r) => r.emcee?.name)).toEqual(["A", "B", "Extra"]);
  });

  it("returns empty array for empty input", () => {
    expect(sortParticipantsByTitle([], "A vs B")).toEqual([]);
  });
});

describe("groupParticipants", () => {
  it("returns empty array when no participants", () => {
    expect(groupParticipants([])).toEqual([]);
    expect(groupParticipants(undefined)).toEqual([]);
  });

  it("groups by label for standard battles", () => {
    const participants = [
      { label: "SPEAKER_00", emcee: { id: "e1", name: "Loonie" } },
      { label: "SPEAKER_01", emcee: { id: "e2", name: "Smugglaz" } },
      { label: "SPEAKER_00", emcee: { id: "e3", name: "Abra" } }, // Same label
    ];

    const groups = groupParticipants(participants);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("SPEAKER_00");
    expect(groups[0].emcees).toHaveLength(2);
    expect(groups[1].label).toBe("SPEAKER_01");
  });

  it("force-groups 2v2 battles (4 emcees, unique labels)", () => {
    const participants = [
      { label: "S0", emcee: { id: "e1", name: "A" } },
      { label: "S1", emcee: { id: "e2", name: "B" } },
      { label: "S2", emcee: { id: "e3", name: "C" } },
      { label: "S3", emcee: { id: "e4", name: "D" } },
    ];

    const groups = groupParticipants(participants);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Team 1");
    expect(groups[0].emcees).toHaveLength(2);
    expect(groups[1].label).toBe("Team 2");
  });

  it("force-groups 3v3 battles (6 emcees, unique labels)", () => {
    const participants = [
      { label: "S0", emcee: { id: "e1", name: "A" } },
      { label: "S1", emcee: { id: "e2", name: "B" } },
      { label: "S2", emcee: { id: "e3", name: "C" } },
      { label: "S3", emcee: { id: "e4", name: "D" } },
      { label: "S4", emcee: { id: "e5", name: "E" } },
      { label: "S5", emcee: { id: "e6", name: "F" } },
    ];

    const groups = groupParticipants(participants);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Team 1");
    expect(groups[0].emcees).toHaveLength(3);
    expect(groups[1].label).toBe("Team 2");
  });

  it("does not force-group if labels are already shared", () => {
    const participants = [
      { label: "Team A", emcee: { id: "e1", name: "A" } },
      { label: "Team A", emcee: { id: "e2", name: "B" } },
      { label: "Team B", emcee: { id: "e3", name: "C" } },
      { label: "Team B", emcee: { id: "e4", name: "D" } },
    ];

    const groups = groupParticipants(participants);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Team A");
    expect(groups[1].label).toBe("Team B");
  });
});
