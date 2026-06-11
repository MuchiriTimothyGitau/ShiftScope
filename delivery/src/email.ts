import { Resend } from 'resend';
import { ImpactBrief } from './types.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export function buildEmailHtml(brief: ImpactBrief): string {
  const breakingRows = brief.breaking_changes
    .map(
      (bc) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${bc.description}</td>
      <td style="padding:8px;border:1px solid #ddd"><pre>${bc.before_code || ''}</pre></td>
      <td style="padding:8px;border:1px solid #ddd"><pre>${bc.after_code || ''}</pre></td>
      <td style="padding:8px;border:1px solid #ddd">${bc.file_hint || '—'}</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:20px;">
  <h2 style="color:${brief.severity === 'critical' ? '#d00' : '#333'}">
    ShiftScope Alert: ${brief.dep_name} ${brief.old_version} → ${brief.new_version}
  </h2>
  <p><strong>Severity:</strong> ${brief.severity.toUpperCase()}</p>
  <p><strong>Summary:</strong> ${brief.summary}</p>
  <p><strong>Est. fix time:</strong> ${brief.estimated_fix_minutes} min</p>
  <p><strong>Safe to upgrade:</strong> ${brief.safe_to_upgrade ? 'Yes (after fix)' : 'No'}</p>
  ${brief.breaking_changes.length > 0 ? `
  <h3>Breaking Changes</h3>
  <table style="border-collapse:collapse;width:100%">
    <thead>
      <tr>
        <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Description</th>
        <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Before</th>
        <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">After</th>
        <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">File Hint</th>
      </tr>
    </thead>
    <tbody>${breakingRows}</tbody>
  </table>` : ''}
</body>
</html>`.trim();
}

export async function sendEmailAlert(brief: ImpactBrief, to: string): Promise<void> {
  await resend.emails.send({
    from: 'ShiftScope <alerts@shiftscope.dev>',
    to,
    subject: `[${brief.severity.toUpperCase()}] ${brief.dep_name} ${brief.old_version} → ${brief.new_version}`,
    html: buildEmailHtml(brief),
  });
}
