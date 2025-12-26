-- Migration: Create function to get top community topics with media
-- Run this in Supabase SQL Editor or via CLI: supabase db push

DROP FUNCTION IF EXISTS get_top_community_topics(DATE);
DROP FUNCTION IF EXISTS get_top_community_topics();

CREATE OR REPLACE FUNCTION get_top_community_topics()
RETURNS TABLE (
  channel_id BIGINT,
  channel_name TEXT,
  topic_title TEXT,
  topic_main_text TEXT,
  topic_sub_topics JSONB,
  media_message_ids TEXT[],
  media_count INT,
  summary_date DATE
) 
LANGUAGE plpgsql
AS $$
DECLARE
  latest_date DATE;
BEGIN
  -- Find the most recent date with summaries (excluding aggregate channel)
  SELECT MAX(ds.date) INTO latest_date
  FROM daily_summaries ds
  WHERE ds.channel_id != 1138790297355174039;

  IF latest_date IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH parsed_topics AS (
    -- Parse all topics from summaries, excluding the aggregate channel
    SELECT 
      ds.channel_id AS ch_id,
      dc.channel_name AS ch_name,
      ds.date AS s_date,
      topic->>'title' AS t_title,
      topic->>'mainText' AS t_main_text,
      topic->'subTopics' AS t_sub_topics,
      -- Collect all media message IDs for this topic
      ARRAY_REMOVE(
        ARRAY[topic->>'mainMediaMessageId'] || 
        COALESCE(
          ARRAY(
            SELECT jsonb_array_elements_text(sub->'subTopicMediaMessageIds')
            FROM jsonb_array_elements(COALESCE(topic->'subTopics', '[]'::jsonb)) AS sub
            WHERE sub->'subTopicMediaMessageIds' IS NOT NULL
          ),
          ARRAY[]::TEXT[]
        ),
        NULL
      ) AS media_ids
    FROM daily_summaries ds
    JOIN discord_channels dc ON ds.channel_id = dc.channel_id
    CROSS JOIN LATERAL jsonb_array_elements(ds.full_summary::jsonb) AS topic
    WHERE ds.date = latest_date
      AND ds.channel_id != 1138790297355174039  -- Exclude aggregate channel
  ),
  ranked_topics AS (
    -- Rank topics within each channel by media count
    SELECT 
      pt.ch_id,
      pt.ch_name,
      pt.s_date,
      pt.t_title,
      pt.t_main_text,
      pt.t_sub_topics,
      pt.media_ids,
      CARDINALITY(pt.media_ids) AS m_count,
      ROW_NUMBER() OVER (
        PARTITION BY pt.ch_id 
        ORDER BY CARDINALITY(pt.media_ids) DESC
      ) AS rank_in_channel
    FROM parsed_topics pt
  )
  -- Get top topic per channel, sorted by media count, limit 3
  SELECT 
    rt.ch_id,
    rt.ch_name,
    rt.t_title,
    rt.t_main_text,
    rt.t_sub_topics,
    rt.media_ids,
    rt.m_count::INT,
    rt.s_date
  FROM ranked_topics rt
  WHERE rt.rank_in_channel = 1
  ORDER BY rt.m_count DESC
  LIMIT 3;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_top_community_topics() TO anon, authenticated, service_role;
