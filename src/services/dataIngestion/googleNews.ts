import { createHash } from 'node:crypto';

export interface RawNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
  retrievedAt: string;
  query?: string;
  sourceType?: NewsArticleSourceType;
  feedUrl?: string;
}

export type NewsApiStatus = 'AVAILABLE' | 'ERROR';
export type NewsIngestionStatus = 'READY' | 'NOT_CONNECTED' | 'ERROR';
export type NewsArticleSourceType = 'google_news' | 'direct_rss';
export type NewsApiSource = 'Google News RSS' | 'Direct RSS' | 'Google News + Direct RSS';

export interface NewsApiResponse {
  status: NewsApiStatus;
  source: NewsApiSource;
  retrievedAt: string;
  count: number;
  articles: RawNewsArticle[];
  sources?: NewsArticleSourceType[];
  failedFeeds?: string[];
}

export const ENERGY_MONITORING_QUERIES = [
  '"crude oil" export disruption',
  '"oil exports" sanctions',
  '"oil imports" disruption',
  '"Strait of Hormuz" oil',
  '"Persian Gulf" oil tanker',
  '"Red Sea" oil shipping',
  '"oil tanker" attack',
  'oil pipeline disruption',
  'oil refinery outage',
  'OPEC geopolitical disruption',
  '"Saudi Arabia" oil exports',
  '"Iran" oil sanctions',
  '"Russia" oil sanctions',
  '"Iraq" oil exports',
  '"United Arab Emirates" oil exports',
  '"Venezuela" oil sanctions',
  '"Nigeria" oil disruption',
] as const;

export const GOOGLE_NEWS_QUERIES = ENERGY_MONITORING_QUERIES;

const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search';
const REQUEST_TIMEOUT_MS = 10_000;
let ingestionStatus: NewsIngestionStatus = 'NOT_CONNECTED';

export function getNewsIngestionStatus(): NewsIngestionStatus {
  return ingestionStatus;
}

function buildFeedUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en'
  });

  return `${GOOGLE_NEWS_RSS_URL}?${params.toString()}`;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

function cleanText(value: string | undefined): string {
  if (!value) return '';

  let cleaned = decodeXmlEntities(value);
  cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  cleaned = decodeXmlEntities(cleaned);

  return cleaned.replace(/\s+/g, ' ').trim();
}

function extractTag(block: string, tagName: string): string | undefined {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  return tagPattern.exec(block)?.[1];
}

function extractAttribute(block: string, tagName: string, attributeName: string): string | undefined {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*\\/?\\s*>`, 'i');
  return tagPattern.exec(block)?.[1];
}

function extractFeedEntries(xml: string): string[] {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
}

function normalizeUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function canonicalArticleUrlForDedup(value: string): string {
  try {
    const url = new URL(value);
    const redirectedUrl = url.hostname.toLowerCase() === 'news.google.com'
      ? url.searchParams.get('url') || url.searchParams.get('u')
      : undefined;
    if (redirectedUrl) return canonicalArticleUrlForDedup(decodeURIComponent(redirectedUrl));
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|oc$|ved$|usg$|ref$|source$|cmpid$|gclid$|fbclid$|output$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.port = ((url.port === '80' && url.protocol === 'http:') || (url.port === '443' && url.protocol === 'https:')) ? '' : url.port;
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().toLowerCase();
  }
}

const normalizedStoryTitle = (title: string): string => title
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function parsePublishedAt(value: string | undefined): string {
  const publishedText = cleanText(value);
  if (!publishedText) return '';

  const timestamp = Date.parse(publishedText);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
}

function stableArticleId(url: string, title: string): string {
  const identity = `${canonicalArticleUrlForDedup(url)}\n${normalizedStoryTitle(title)}`;
  const digest = createHash('sha256').update(identity).digest('hex').slice(0, 24);
  return `news-${digest}`;
}

function sourceFromTitle(title: string): { title: string; source: string } {
  const match = title.match(/^(.+?)\s+-\s+([^\-]+)$/);
  if (!match) return { title, source: '' };

  return {
    title: match[1].trim(),
    source: match[2].trim()
  };
}

function parseItem(itemXml: string, query: string, retrievedAt: string, sourceType: NewsArticleSourceType, feedUrl?: string): RawNewsArticle | null {
  const rawTitle = cleanText(extractTag(itemXml, 'title'));
  const rawLink = cleanText(extractTag(itemXml, 'link')) || cleanText(extractAttribute(itemXml, 'link', 'href'));
  const url = normalizeUrl(rawLink);
  const rawPublishedAt = extractTag(itemXml, 'pubDate') ?? extractTag(itemXml, 'published') ?? extractTag(itemXml, 'updated');
  const publishedAt = parsePublishedAt(rawPublishedAt);

  if (!rawTitle || !url) return null;
  if (cleanText(rawPublishedAt) && !publishedAt) return null;

  const parsedTitle = sourceFromTitle(rawTitle);
  const explicitSource = cleanText(extractTag(itemXml, 'source'));
  const description = cleanText(extractTag(itemXml, 'description') ?? extractTag(itemXml, 'summary') ?? extractTag(itemXml, 'content'));
  const article: RawNewsArticle = {
    id: stableArticleId(url, parsedTitle.title),
    title: parsedTitle.title,
    url,
    source: explicitSource || parsedTitle.source,
    publishedAt,
    retrievedAt,
    query,
    sourceType,
    ...(feedUrl ? { feedUrl } : {})
  };

  if (description) article.description = description;
  return article;
}

export function parseRssFeed(xml: string, query = '', retrievedAt = new Date().toISOString(), sourceType: NewsArticleSourceType = 'google_news', feedUrl?: string): RawNewsArticle[] {
  return extractFeedEntries(xml)
    .map((itemXml) => parseItem(itemXml, query, retrievedAt, sourceType, feedUrl))
    .filter((article): article is RawNewsArticle => article !== null);
}

export function parseGoogleNewsRss(xml: string, query = '', retrievedAt = new Date().toISOString()): RawNewsArticle[] {
  return parseRssFeed(xml, query, retrievedAt, 'google_news');
}

async function fetchRssUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'ORBIT/Phase2 GoogleNewsIngestion'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`RSS feed returned HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export interface GoogleNewsFetchOptions {
  queries?: readonly string[];
  feedUrls?: readonly string[];
}

const fetchFeed = async (query: string): Promise<string> => fetchRssUrl(buildFeedUrl(query));

export async function fetchGoogleNews(options: GoogleNewsFetchOptions = {}): Promise<NewsApiResponse> {
  const retrievedAt = new Date().toISOString();
  const googleQueries = options.queries?.length
    ? [...options.queries]
    : (options.feedUrls?.length ? [] : [...GOOGLE_NEWS_QUERIES]);
  const feeds = [
    ...googleQueries.map((query) => ({ label: query, sourceType: 'google_news' as const, fetch: () => fetchFeed(query) })),
    ...(options.feedUrls || []).map((url) => ({ label: url, sourceType: 'direct_rss' as const, fetch: () => fetchRssUrl(url) })),
  ];
  const results = await Promise.allSettled(
    feeds.map(async (feed) => ({
      query: feed.label,
      xml: await feed.fetch()
    }))
  );

  const articlesByKey = new Map<string, RawNewsArticle>();
  const seenArticleKeys = new Set<string>();
  const successfulSourceTypes = new Set<NewsArticleSourceType>();
  const failedFeeds: string[] = [];
  let successfulFeeds = 0;

  results.forEach((result, index) => {
    const query = feeds[index].label;
    if (result.status === 'rejected') {
      console.warn(`[ORBIT News] Feed failed for "${query}":`, result.reason);
      failedFeeds.push(query);
      return;
    }

    successfulFeeds += 1;
    successfulSourceTypes.add(feeds[index].sourceType);
    try {
      for (const article of parseRssFeed(result.value.xml, query, retrievedAt, feeds[index].sourceType, feeds[index].sourceType === 'direct_rss' ? query : undefined)) {
        const urlKey = `url:${canonicalArticleUrlForDedup(article.url)}`;
        const publishedKey = article.publishedAt ? article.publishedAt.slice(0, 16) : 'undated';
        const storyKey = `story:${normalizedStoryTitle(article.title)}:${publishedKey}`;
        if (seenArticleKeys.has(urlKey) || seenArticleKeys.has(storyKey)) continue;
        seenArticleKeys.add(urlKey);
        seenArticleKeys.add(storyKey);
        articlesByKey.set(urlKey, article);
      }
    } catch (error) {
      console.warn(`[ORBIT News] Feed parsing failed for "${query}":`, error);
      failedFeeds.push(query);
    }
  });

  const articles = [...articlesByKey.values()].sort((a, b) => {
    const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return right - left;
  });

  if (successfulFeeds === 0) {
    ingestionStatus = 'ERROR';
    return {
      status: 'ERROR',
      source: 'Google News RSS',
      retrievedAt,
      count: 0,
      articles: [],
      sources: [],
      failedFeeds
    };
  }

  ingestionStatus = 'READY';
  const sources = [...successfulSourceTypes];
  const source = sources.length === 2 ? 'Google News + Direct RSS' : sources[0] === 'direct_rss' ? 'Direct RSS' : 'Google News RSS';
  return {
    status: 'AVAILABLE',
    source,
    retrievedAt,
    count: articles.length,
    articles,
    sources,
    ...(failedFeeds.length ? { failedFeeds } : {})
  };
}
