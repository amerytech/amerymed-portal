import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { fetchOfficialIndustryUpdates } from '@/lib/industry-updates';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected industry update sync error';
}

function balanceFeedItems<T extends { source_name: string }>(items: T[]) {
  const buckets = new Map<string, T[]>();
  const sourceLimits: Record<string, number> = {
    'NIH News Releases': 1,
  };
  const sourceCounts = new Map<string, number>();

  for (const item of items) {
    const bucket = buckets.get(item.source_name) || [];
    bucket.push(item);
    buckets.set(item.source_name, bucket);
  }

  const balanced: T[] = [];
  const sourceNames = Array.from(buckets.keys());

  while (sourceNames.some((sourceName) => (buckets.get(sourceName) || []).length > 0) && balanced.length < 5) {
    for (const sourceName of sourceNames) {
      const bucket = buckets.get(sourceName) || [];
      const currentCount = sourceCounts.get(sourceName) || 0;
      const maxForSource = sourceLimits[sourceName] ?? Number.POSITIVE_INFINITY;

      if (currentCount >= maxForSource) {
        continue;
      }

      const nextItem = bucket.shift();
      if (nextItem) {
        balanced.push(nextItem);
        sourceCounts.set(sourceName, currentCount + 1);
      }
      if (balanced.length >= 5) break;
    }
  }

  return balanced;
}

export async function POST() {
  try {
    const supabase = createAdminSupabaseClient();
    const fetchedItems = await fetchOfficialIndustryUpdates();

    if (!fetchedItems.length) {
      return NextResponse.json({ inserted: 0, skipped: 0, message: 'No feed items fetched.' });
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('industry_updates')
      .select('source_url, title')
      .order('published_at', { ascending: false })
      .limit(200);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingKeys = new Set(
      (existingRows || []).map((row) => `${row.source_url || ''}::${row.title || ''}`)
    );

    const itemsToInsert = fetchedItems.filter(
      (item) => !existingKeys.has(`${item.source_url || ''}::${item.title || ''}`)
    );

    if (!itemsToInsert.length) {
      return NextResponse.json({ inserted: 0, skipped: fetchedItems.length });
    }

    const { error: insertError } = await supabase.from('industry_updates').insert(itemsToInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      inserted: itemsToInsert.length,
      skipped: fetchedItems.length - itemsToInsert.length,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from('industry_updates')
      .select(
        'id, title, summary, topic, source_name, source_url, published_at, audience, is_published'
      )
      .eq('is_published', true)
      .in('audience', ['all', 'client'])
      .not('source_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: balanceFeedItems(data || []) });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
