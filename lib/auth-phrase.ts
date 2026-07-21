export function normalizeControlPhrase(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .split(/\s+/u)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
}

export function controlPhraseWords(value: string) {
  const normalized = normalizeControlPhrase(value);
  return normalized ? normalized.split(" ") : [];
}

export function isValidControlPhrase(value: string) {
  const words = controlPhraseWords(value);

  return (
    words.length === 3 &&
    new Set(words).size === 3 &&
    words.every((word) => word.length >= 3) &&
    normalizedPhraseLength(words) >= 10 &&
    normalizedPhraseLength(words) <= 120
  );
}

function normalizedPhraseLength(words: string[]) {
  return words.join(" ").length;
}
