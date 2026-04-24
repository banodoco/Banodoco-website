const DISCORD_RESOURCE_CHANNEL_NAMES: Record<string, string> = {
  '1149372684220768367': 'resources',
  '1275200992136400967': 'flux_resources',
  '1373291419434877078': 'wan_resources',
  '1457981813120176138': 'ltx_resources',
  '1472633200491626526': 'acestep_resources',
}

export function getDiscordResourceChannelName(channelId: string | number | null | undefined): string | null {
  if (channelId === null || channelId === undefined) return null
  return DISCORD_RESOURCE_CHANNEL_NAMES[String(channelId)] ?? null
}

export function buildDiscordMessageUrl(
  guildId: string | number | null | undefined,
  channelId: string | number | null | undefined,
  messageId: string | number | null | undefined,
): string | null {
  if (guildId === null || guildId === undefined) return null
  if (channelId === null || channelId === undefined) return null
  if (messageId === null || messageId === undefined) return null
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
}
