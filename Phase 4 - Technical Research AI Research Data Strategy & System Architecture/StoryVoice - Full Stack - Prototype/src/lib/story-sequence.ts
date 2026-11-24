export interface StorySequenceTemplate {
  title: string;
  description: string;
  spokenPassage: string;
}

export const SEQUENTIAL_STORY_TEMPLATES: StorySequenceTemplate[] = [
  {
    title: "Chapter 1: Arrival at Greyhaven",
    description: "Mara arrives at the coastal village as the evening tide sets in.",
    spokenPassage:
      "The salt air met me before the town even came into view. Greyhaven sat huddled between the jagged cliffs and the black water, its chimneys sending thin spirals of smoke into the darkening sky.",
  },
  {
    title: "Chapter 2: The Coast Road",
    description: "Driving along the eroding bluffs toward the north point.",
    spokenPassage:
      "The gravel crunched beneath the tires, the narrow lane winding perilously close to the bluff edge. To the east, the sea surged relentlessly against the granite rocks below. I gripped the wheel tighter as the fog began to roll in.",
  },
  {
    title: "Chapter 3: The North Point",
    description: "Approaching the headland where the old light stands silent.",
    spokenPassage:
      "The trees fell away as the grade leveled out. Ahead stood the silhouette of the headland, rising dark against the gray swell of the ocean. The iron gate hung unlatched, swinging slightly with the tide.",
  },
  {
    title: "Chapter 4: The Keepers Steps",
    description: "Climbing the spiral stairs inside the abandoned lighthouse tower.",
    spokenPassage:
      "A narrow stone staircase curved up into the dark interior of the tower. Water dripped from the ceiling in steady, rhythmic taps. Each step echoed against the cold granite walls as I began the climb into the darkness.",
  },
  {
    title: "Chapter 5: The Lantern Room",
    description: "Reaching the glass gallery overlooking the midnight sea.",
    spokenPassage:
      "I reached the lantern room just as midnight struck. Through the curved storm glass, the vast emptiness of the bay stretched outward under a cloudless sky, cold and silent under the stars.",
  },
  {
    title: "Chapter 6: The Signal Log",
    description: "Uncovering the final entry left behind in the keeper's desk.",
    spokenPassage:
      "The iron desk in the corner had resisted the damp salt air. Beneath a layer of sea dust lay the open leather ledger, its final entry inscribed with three frantic words that changed everything.",
  },
];

export interface NextSceneDetails {
  order: number;
  title: string;
  recordingTitle: string;
  description: string;
  spokenPassage: string;
  previousSceneTitle?: string;
  previousSceneId?: string;
}

export function getNextSequenceDetails(
  afterSceneId?: string | null,
  knownScenes: Array<{ id: string; title: string; sortOrder?: number; sort_order?: number }> = []
): NextSceneDetails {
  if (afterSceneId && knownScenes.length > 0) {
    const prev = knownScenes.find((s) => s.id === afterSceneId);
    if (prev) {
      const prevOrder = prev.sortOrder ?? prev.sort_order ?? 1;
      const nextOrder = prevOrder + 1;
      const templateIdx = Math.min(nextOrder - 1, SEQUENTIAL_STORY_TEMPLATES.length - 1);
      const template = SEQUENTIAL_STORY_TEMPLATES[templateIdx] || {
        title: `Chapter ${nextOrder}: Continuing Scene`,
        description: `Continuation of the manuscript following ${prev.title}.`,
        spokenPassage: `The narrative pushed forward past ${prev.title}, opening into new terrain. Every sound in the stillness seemed to carry weight as the night deepened.`,
      };

      return {
        order: nextOrder,
        title: template.title,
        recordingTitle: `${template.title} — first pass`,
        description: template.description,
        spokenPassage: template.spokenPassage,
        previousSceneTitle: prev.title,
        previousSceneId: prev.id,
      };
    }
  }

  // Fallback when afterSceneId is not provided or not found
  const total = knownScenes.length || 3;
  const nextOrder = total + 1;
  const templateIdx = Math.min(nextOrder - 1, SEQUENTIAL_STORY_TEMPLATES.length - 1);
  const template = SEQUENTIAL_STORY_TEMPLATES[templateIdx] || {
    title: `Chapter ${nextOrder}: Continuing Scene`,
    description: "A new scene continuing the manuscript in sequence.",
    spokenPassage: "A narrow stone staircase curved up into the dark interior of the tower. Water dripped from the ceiling in steady, rhythmic taps.",
  };

  return {
    order: nextOrder,
    title: template.title,
    recordingTitle: `${template.title} — first pass`,
    description: template.description,
    spokenPassage: template.spokenPassage,
  };
}
