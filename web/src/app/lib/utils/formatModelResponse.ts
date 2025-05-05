/**
 * Utility function to format model responses using Markdown
 * Enhanced for better readability and conversation flow
 */

/**
 * Format the model response with Markdown
 * @param text The raw model response
 * @returns Formatted text with proper Markdown
 */
export function formatModelResponse(text: string): string {
  // If the text is already formatted with Markdown, return it as is
  if (text.includes("# ") || text.includes("## ") || text.includes("```")) {
    return text;
  }

  // Split the text into paragraphs
  const paragraphs = text.split("\n\n");

  // Format responses as more conversational and concise
  if (paragraphs.length > 0) {
    // Process the first paragraph - make it a clean, brief summary
    if (paragraphs[0].length < 120) {
      // If it's already short, format it as a bold statement
      paragraphs[0] = `**${paragraphs[0].trim()}**`;
    } else {
      // For longer first paragraphs, extract key information
      const firstSentences = extractFirstFewSentences(paragraphs[0], 2);
      paragraphs[0] = `**${firstSentences.trim()}**`;
    }
  }

  // Process each additional paragraph to add Markdown formatting
  const formatted = paragraphs.map((paragraph, index) => {
    // Skip the first paragraph as we've already processed it
    if (index === 0) {
      return paragraph;
    }

    // Trim whitespace
    paragraph = paragraph.trim();

    // Skip empty paragraphs
    if (!paragraph) {
      return "";
    }

    // Check if this is a list-like paragraph
    if (paragraph.includes("\n- ") || paragraph.includes("\n* ")) {
      // Already formatted as a list
      return paragraph;
    }

    // If the paragraph contains a colon and is short, it might be a section heading
    if (paragraph.includes(":") && paragraph.length < 80 && !paragraph.includes("\n")) {
      const parts = paragraph.split(":");
      if (parts.length === 2) {
        return `### ${parts[0].trim()}\n${parts[1].trim()}`;
      }
    }

    // Check for potential key points (short sentences that might be important)
    if (paragraph.length < 100 && isImportantPoint(paragraph)) {
      return `> ${paragraph}`;
    }

    return paragraph;
  });

  // Join the paragraphs back together
  return formatted.join("\n\n");
}

/**
 * Extract the first few sentences from a paragraph
 * @param text The paragraph text
 * @param sentenceCount Number of sentences to extract
 * @returns The first few sentences as a string
 */
function extractFirstFewSentences(text: string, sentenceCount: number): string {
  // Simple sentence splitting by common sentence endings
  const sentenceRegex = /[.!?]+\s+/g;
  const sentences = text.split(sentenceRegex);

  // Join the first few sentences back together
  return sentences.slice(0, sentenceCount).join(". ") + (sentences.length > sentenceCount ? "." : "");
}

/**
 * Determine if a paragraph is likely an important point
 * @param text The paragraph text
 * @returns True if the text appears to be an important point
 */
function isImportantPoint(text: string): boolean {
  // Check for key phrases that might indicate important information
  const keyPhrases = [
    "important",
    "key",
    "critical",
    "essential",
    "note",
    "remember",
    "consider",
    "suggestion",
    "recommend",
    "takeaway",
  ];

  const lowerText = text.toLowerCase();
  return (
    keyPhrases.some((phrase) => lowerText.includes(phrase)) ||
    (text.length < 120 && (lowerText.startsWith("this") || lowerText.startsWith("the") || lowerText.startsWith("your")))
  );
}
