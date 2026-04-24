export const EMBED_REGEX = /::(art|resource|media)\[([0-9a-f-]{36})\]/g;

export type PostEmbedType = 'art' | 'resource' | 'media';

export interface ExtractedEmbedRefs {
  mediaIds: string[];
  assetIds: string[];
}

export type PostBodySegment =
  | { type: 'text'; content: string }
  | { type: 'embed'; embedType: PostEmbedType; id: string; token: string };

const createEmbedRegex = (): RegExp => new RegExp(EMBED_REGEX.source, 'g');

export const extractEmbedRefs = (body: string | null | undefined): ExtractedEmbedRefs => {
  const mediaIds: string[] = [];
  const assetIds: string[] = [];
  const seenMediaIds = new Set<string>();
  const seenAssetIds = new Set<string>();

  if (!body) {
    return { mediaIds, assetIds };
  }

  const regex = createEmbedRegex();

  for (const match of body.matchAll(regex)) {
    const embedType = match[1] as PostEmbedType;
    const id = match[2];

    if (embedType === 'resource') {
      if (!seenAssetIds.has(id)) {
        seenAssetIds.add(id);
        assetIds.push(id);
      }
      continue;
    }

    if (!seenMediaIds.has(id)) {
      seenMediaIds.add(id);
      mediaIds.push(id);
    }
  }

  return { mediaIds, assetIds };
};

export const splitBodyIntoSegments = (body: string | null | undefined): PostBodySegment[] => {
  if (!body) {
    return [];
  }

  const segments: PostBodySegment[] = [];
  const regex = createEmbedRegex();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: body.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: 'embed',
      embedType: match[1] as PostEmbedType,
      id: match[2],
      token: match[0],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < body.length) {
    segments.push({
      type: 'text',
      content: body.slice(lastIndex),
    });
  }

  return segments;
};
