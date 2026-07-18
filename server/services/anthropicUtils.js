/**
 * Shared helper for reading Claude's response text.
 *
 * message.content[0] isn't reliably the text block — a thinking block (or
 * any other content type) can come first, in which case content[0].text is
 * undefined and .trim() on it throws "Cannot read properties of undefined
 * (reading 'trim')". Find the first actual text block instead of assuming
 * it's at index 0.
 */
function extractText(message) {
  const textBlock = (message.content || []).find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Claude response contained no text block');
  }
  return textBlock.text.trim();
}

module.exports = { extractText };
