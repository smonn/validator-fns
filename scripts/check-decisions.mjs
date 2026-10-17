// Fails while a pull request description has open decisions: any text under
// its "## Decisions needed" heading, up to the next heading of the same or a
// higher level, apart from HTML comments and whitespace. CI passes the
// description in PR_BODY. Answering a decision means deleting the section and
// recording the answer elsewhere in the description.
//
// A status check attaches to a commit, so every open pull request with the
// same head commit shows this result (#611). CI lists them in SAME_HEAD_PRS, a
// file with one {number, body} JSON object per line, and the check fails if
// any of them has open decisions. The triggering pull request, PR_NUMBER, is
// read from PR_BODY instead, which is current as of the event.
import { readFileSync } from 'node:fs';

/** @param {string | null | undefined} text */
function openDecisions(text) {
  const body = (text ?? '').replaceAll('\r\n', '\n');
  const heading = /^##[ \t]+Decisions needed[ \t]*$/im.exec(body);
  if (!heading) {
    return '';
  }

  const rest = body.slice(heading.index + heading[0].length);
  const nextHeading = /^#{1,2}[ \t]/m.exec(rest);
  return rest
    .slice(0, nextHeading?.index)
    .replaceAll(/<!--[\s\S]*?-->/g, '')
    .trim();
}

const number = Number(process.env['PR_NUMBER']);
const listFile = process.env['SAME_HEAD_PRS'];
const others = listFile
  ? readFileSync(listFile, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .filter((pr) => pr.number !== number)
  : [];

const own = openDecisions(process.env['PR_BODY']);
if (own) {
  console.error(
    `The description has open decisions:\n\n${own}\n\nOnce they're answered, record the answers elsewhere in the description and delete the "Decisions needed" section.`,
  );
  process.exit(1);
}

const blocked = others.filter((pr) => openDecisions(pr.body));
if (blocked.length > 0) {
  const list = blocked.map((pr) => `#${pr.number}`).join(', ');
  console.error(
    `This pull request's description has no open decisions, but ${list} shares its head commit and has open decisions. The check result attaches to the commit, so it shows on every one of them. Answer those decisions, or close the pull request that shouldn't share this branch.`,
  );
  process.exit(1);
}
console.log(
  'No open decisions on any open pull request with this head commit.',
);
