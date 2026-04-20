type FeedSource = {
  sourceName: string;
  topic: string;
  audience: 'client' | 'all';
  url: string;
  kind?: 'rss' | 'cms-newsroom';
};

export type NormalizedIndustryUpdate = {
  title: string;
  summary: string;
  topic: string;
  source_name: string;
  source_url: string;
  audience: 'client' | 'all';
  is_published: boolean;
  published_at: string;
};

function balanceItems<T extends { source_name: string }>(items: T[], limit = 18) {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const bucket = buckets.get(item.source_name) || [];
    bucket.push(item);
    buckets.set(item.source_name, bucket);
  }

  const balanced: T[] = [];
  const sourceNames = Array.from(buckets.keys());

  while (sourceNames.some((sourceName) => (buckets.get(sourceName) || []).length > 0) && balanced.length < limit) {
    for (const sourceName of sourceNames) {
      const bucket = buckets.get(sourceName) || [];
      const nextItem = bucket.shift();
      if (nextItem) {
        balanced.push(nextItem);
      }
      if (balanced.length >= limit) break;
    }
  }

  return balanced;
}

const FEED_SOURCES: FeedSource[] = [
  {
    sourceName: 'FDA MedWatch',
    topic: 'Patient safety',
    audience: 'client',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml',
  },
  {
    sourceName: 'CMS Newsroom',
    topic: 'CMS policy',
    audience: 'client',
    url: 'https://www.cms.gov/about-cms/contact/newsroom',
    kind: 'cms-newsroom',
  },
  {
    sourceName: 'NIH News Releases',
    topic: 'Clinical research',
    audience: 'client',
    url: 'https://www.nih.gov/news-releases/feed.xml',
  },
];

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTag(xml: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = xml.match(pattern);
  return match?.[1] ? stripHtml(match[1]) : '';
}

function parseRssDate(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

function parseCmsNewsroomItems(html: string, source: FeedSource) {
  const rows = html.match(/<div class="views-row">[\s\S]*?<\/a>\s*<\/div><\/span><\/div><\/div>/gi) || [];

  return rows
    .map((rowHtml) => {
      const titleMatch = rowHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const summaryMatch = rowHtml.match(
        /<span class="newsroom-main-view-body[^"]*"[^>]*>([\s\S]*?)<\/span>/i
      );
      const linkMatch = rowHtml.match(/<a href="([^"]+)" class="ds-c-button newsroom-main-view-link">/i);
      const timeMatch = rowHtml.match(/<time datetime="([^"]+)"/i);
      const badgeMatch = rowHtml.match(/<span class="ds-c-badge[^"]*">([\s\S]*?)<\/span>/i);

      const title = titleMatch ? stripHtml(titleMatch[1]) : '';
      const summary = summaryMatch ? stripHtml(summaryMatch[1]) : '';
      const relativeLink = linkMatch?.[1] || '';
      const sourceUrl = relativeLink ? `https://www.cms.gov${relativeLink}` : '';
      const publishedAt = parseRssDate(timeMatch?.[1] || '');
      const badgeTopic = badgeMatch ? stripHtml(badgeMatch[1]) : '';

      if (!title || !sourceUrl) return null;

      const normalizedItem: NormalizedIndustryUpdate = {
        title,
        summary,
        topic: badgeTopic || source.topic,
        source_name: source.sourceName,
        source_url: sourceUrl,
        audience: source.audience,
        is_published: true,
        published_at: publishedAt,
      };

      return normalizedItem;
    })
    .filter((item): item is NormalizedIndustryUpdate => Boolean(item));
}

function normalizeFeedItems(feedXml: string, source: FeedSource) {
  if (source.kind === 'cms-newsroom') {
    return parseCmsNewsroomItems(feedXml, source);
  }

  const items = feedXml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return items
    .map((itemXml) => {
      const title = extractTag(itemXml, 'title');
      const sourceUrl = extractTag(itemXml, 'link') || extractTag(itemXml, 'guid');
      const summary = extractTag(itemXml, 'description');
      const publishedAt = parseRssDate(extractTag(itemXml, 'pubDate'));

      if (!title || !sourceUrl) return null;

      const normalizedItem: NormalizedIndustryUpdate = {
        title,
        summary,
        topic: source.topic,
        source_name: source.sourceName,
        source_url: sourceUrl,
        audience: source.audience,
        is_published: true,
        published_at: publishedAt,
      };

      return normalizedItem;
    })
    .filter((item): item is NormalizedIndustryUpdate => Boolean(item));
}

export async function fetchOfficialIndustryUpdates() {
  const collected: NormalizedIndustryUpdate[] = [];

  for (const source of FEED_SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'AmeryMedIndustryFeed/1.0',
          Accept:
            source.kind === 'cms-newsroom'
              ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              : 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
        next: { revalidate: 60 * 60 },
      });

      if (!response.ok) {
        continue;
      }

      const feedXml = await response.text();
      collected.push(...normalizeFeedItems(feedXml, source));
    } catch {
      // Ignore a single-source failure so the rest of the feed can still load.
    }
  }

  const deduped = new Map<string, NormalizedIndustryUpdate>();

  for (const item of collected) {
    const key = `${item.source_name}::${item.source_url || item.title}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return balanceItems(Array.from(deduped.values()), 18);
}
