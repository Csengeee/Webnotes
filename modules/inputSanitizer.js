// Basic input sanitizer utilities — lightweight, not a replacement for a robust HTML sanitizer.
const MAX_TITLE_LENGTH = 255;
const MAX_CONTENT_LENGTH = 20000;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;

function stripScripts(str) {
  return String(str || '').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

function stripTags(str) {
  // remove any HTML tags
  return String(str || '').replace(/<[^>]*>/g, '');
}

function normalizeWhitespace(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

function sanitizeText(input, maxLen = 0) {
  let s = stripScripts(input);
  s = stripTags(s);
  s = normalizeWhitespace(s);
  if (maxLen && s.length > maxLen) s = s.substring(0, maxLen);
  return s;
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags.map(t => sanitizeText(t, MAX_TAG_LENGTH)).filter(t => t.length > 0);
  // unique and limit
  return [...new Set(cleaned)].slice(0, MAX_TAGS);
}

module.exports = {
  sanitizeText,
  sanitizeTags,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
};
