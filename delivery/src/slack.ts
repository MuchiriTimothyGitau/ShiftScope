import { WebClient } from '@slack/web-api';
import { ImpactBrief } from '../../scheduler/src/types';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const SEVERITY_EMOJI: Record<string, string> = {
  critical: ':red_circle:',
  high: ':large_orange_circle:',
  medium: ':large_yellow_circle:',
  low: ':white_circle:',
};

export function buildSlackBlocks(brief: ImpactBrief): object[] {
  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${SEVERITY_EMOJI[brief.severity]} ShiftScope — ${brief.dep_name} ${brief.old_version} → ${brief.new_version}`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary:* ${brief.summary}` },
    },
  ];

  for (const bc of brief.breaking_changes) {
    if (bc.before_code || bc.after_code) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Breaking:* ${bc.description}\n\`\`\`\n- ${bc.before_code}\n+ ${bc.after_code}\n\`\`\``,
        },
      });
    }
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Est. fix time: ${brief.estimated_fix_minutes} min  |  Safe to upgrade: ${brief.safe_to_upgrade ? 'Yes (after fix)' : 'No'}`,
      },
    ],
  });

  return blocks;
}

export async function sendSlackAlert(brief: ImpactBrief, channel?: string): Promise<void> {
  const blocks = buildSlackBlocks(brief);
  await slack.chat.postMessage({
    channel: channel || process.env.SLACK_DEFAULT_CHANNEL!,
    blocks,
    text: `[${brief.severity.toUpperCase()}] ${brief.dep_name} ${brief.old_version} → ${brief.new_version}`,
  });
}
