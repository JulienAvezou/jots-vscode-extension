export const extractTextFromLexical = (lexicalContent: any): string => {
  if (!lexicalContent || !lexicalContent.root || !Array.isArray(lexicalContent.root.children)) {
    return '';
  }

  let plainText = '';

  // Iterate over paragraphs (children of root)
  for (const paragraph of lexicalContent.root.children) {
    if (!paragraph.children || !Array.isArray(paragraph.children)) {
      continue;
    }

    // Iterate over text nodes inside each paragraph
    for (const textNode of paragraph.children) {
      if (typeof textNode.text === 'string') {
        plainText += textNode.text;
      }
    }

    // Add a newline after each paragraph (optional)
    plainText += '\n';
  }

  // Trim trailing newline
  return plainText.trim();
};
