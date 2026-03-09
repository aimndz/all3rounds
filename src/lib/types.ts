export type SearchResult = {
  id: number;
  content: string;
  start_time: number;
  end_time: number;
  round_number: number | null;
  speaker_label: string | null;
  emcee: {
    id: string;
    name: string;
  } | null;
  speaker_ids?: string[] | null;
  emcees?: {
    id: string;
    name: string;
  }[];
  battle: {
    id: string;
    title: string;
    youtube_id: string;
    event_name: string | null;
    event_date: string | null;
    url: string;
    status: BattleStatus;
    participants?: {
      label: string;
      emcee: { id: string; name: string } | null;
    }[];
  };
  prev_line?: {
    id: number;
    content: string;
    speaker_label: string | null;
    round_number: number | null;
  } | null;
  next_line?: {
    id: number;
    content: string;
    speaker_label: string | null;
    round_number: number | null;
  } | null;
};

export type Emcee = {
  id: string;
  name: string;
  aka: string[];
};

export type BattleStatus = "raw" | "arranged" | "reviewing" | "reviewed";
export type Battle = {
  id: string;
  title: string;
  youtube_id: string;
  event_name: string | null;
  event_date: string | null;
  url: string;
  status: BattleStatus;
};
