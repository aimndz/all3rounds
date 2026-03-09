import { describe, it, expect } from "vitest";
import { groupParticipants } from "../participant-grouping";

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
