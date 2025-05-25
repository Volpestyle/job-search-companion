/**
 * Shared prompt for finding elements in accessibility trees
 * Used by both AINavigator and tests to ensure consistency
 */

export function createElementFindingPrompt(instruction: string, tree: string): string {
  return `You are an expert at finding UI elements in accessibility trees.

Task: Find elements matching "${instruction}"

The accessibility tree format is: [nodeId] role: text content

Important rules:
1. Only return elements that match the instruction
2. Focus on the ROLE of elements:
   - combobox = dropdown/search input
   - textbox = text input field
   - button = clickable button
   - link = clickable link
   - StaticText = non-interactive text (DO NOT return these for interactive requests)
3. Look at both the role AND the text content
4. Return the exact nodeId from the brackets
5. For click/interactive instructions, only return interactive elements (button, link, combobox, etc)
6. Text matching: Elements can match if they CONTAIN the specified text, not just exact matches

ACCESSIBILITY TREE:
${tree}

Return JSON with matching elements:
{
  "elements": [
    {
      "nodeId": <number from brackets>,
      "description": "<brief description of the element>",
      "confidence": <0.0-1.0 based on match quality>
    }
  ]
}

If no elements match, return empty array: {"elements": []}`;
}

// System prompt for the LLM
export const ELEMENT_FINDING_SYSTEM_PROMPT = 'You find elements in accessibility trees. Return only exact matches with high confidence.';