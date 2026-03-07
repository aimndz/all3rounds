export interface BattleResponse {
  id?: string;
  title: string;
  youtube_id?: string;
  event_name?: string | null;
  event_date?: string | null;
  status?: string;
  url?: string;
  count?: number;
}

/**
 * Tokenize a search query into meaningful words.
 * Strips out noise words like "vs", "v", "and" to enable order-independent matching.
 */
export function parseSearchTokens(query: string): string[] {
  if (!query) return [];

  const normalized = query.toLowerCase().replace(/[.,!?'"]/g, "");

  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .filter((t) => !["vs", "v", "and", "the", "pt", "part"].includes(t));

  return Array.from(new Set(tokens));
}

/**
 * Standard Levenshtein Distance algorithm to compute edit distance between two strings.
 * Used for typo tolerance.
 */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Scores a battle's relevance against a set of search tokens.
 *
 * Scoring Weights:
 * - Exact full word match: 100pts
 * - Substring match: 50pts + (len * 2)
 * - Exact sequence match in title: +10000pts (guarantees #1)
 * - Reversed sequence match in title: +5000pts
 * - All tokens matched bonus: +1000pts
 * - Event name match bonus: +10pts
 * - Fuzzy typo match: 5-15pts
 */
export function scoreBattle(battle: BattleResponse, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const titleWords = battle.title
    .toLowerCase()
    .split(/\s+/)
    .map((w: string) => w.replace(/[.,!?'"]/g, ""));
  const eventWords = (battle.event_name || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w: string) => w.replace(/[.,!?'"]/g, ""));

  const allWords = [...titleWords, ...eventWords];

  let score = 0;
  let tokensMatched = 0;

  for (const token of tokens) {
    let tokenScore = 0;
    let matched = false;

    for (const word of allWords) {
      if (!word) continue;

      // Tier 1: Exact word match
      if (word === token) {
        tokenScore = Math.max(tokenScore, 100);
        matched = true;
      }
      // Tier 2: Substring match (e.g. "loon" matches "loonie")
      else if (word.includes(token) || token.includes(word)) {
        tokenScore = Math.max(tokenScore, 50 + token.length * 2);
        matched = true;
      }
      // Tier 3: Fuzzy match for typos (requires 3+ char tokens)
      else if (!matched && token.length >= 3 && word.length >= 3) {
        const allowedDistance = Math.floor(
          Math.max(token.length, word.length) * 0.3,
        );
        const distance = levenshtein(token, word);

        if (distance <= allowedDistance) {
          const fuzzyScore = Math.max(5, 15 - distance * 2);
          tokenScore = Math.max(tokenScore, fuzzyScore);
          matched = true;
        }
      }
    }

    // Boost score if the token specifically appears in the event name
    for (const eWord of eventWords) {
      if (
        eWord &&
        (eWord.includes(token) ||
          token.includes(eWord) ||
          (token.length >= 3 &&
            eWord.length >= 3 &&
            levenshtein(token, eWord) <= 1))
      ) {
        tokenScore += 10;
        break;
      }
    }

    if (matched) tokensMatched++;
    score += tokenScore;
  }

  // Final Ranking Adjustments
  if (tokensMatched === tokens.length && tokens.length > 0) {
    score += 1000; // Big bonus for finding all pieces of the query

    // Sequence Checks (handles reversed names like "Loonie Mhot" when title is "Mhot vs Loonie")
    const titleTokens = titleWords.filter(
      (w) => !["vs", "v", "and", "the", "pt", "part"].includes(w),
    );

    const titleTokensStr = ` ${titleTokens.join(" ")} `;
    const tokensStr = ` ${tokens.join(" ")} `;
    const reversedTokensStr = ` ${[...tokens].reverse().join(" ")} `;

    // Bonus for matching the exact phrase or reversed phrase in the title
    if (titleTokensStr.includes(tokensStr)) {
      score += 10000;
    } else if (titleTokensStr.includes(reversedTokensStr)) {
      score += 5000;
    }
  }

  return score;
}
