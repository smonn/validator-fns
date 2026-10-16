// Fails while a pull request description has open decisions: any text under
// its "## Decisions needed" heading, up to the next heading of the same or a
// higher level, apart from HTML comments and whitespace. CI passes the
// description in PR_BODY. Answering a decision means deleting the section and
// recording the answer elsewhere in the description.
const body = (process.env['PR_BODY'] ?? '').replaceAll('\r\n', '\n');

const heading = /^##[ \t]+Decisions needed[ \t]*$/im.exec(body);
if (!heading) {
  console.log('No "Decisions needed" section.');
  process.exit(0);
}

const rest = body.slice(heading.index + heading[0].length);
const nextHeading = /^#{1,2}[ \t]/m.exec(rest);
const section = rest
  .slice(0, nextHeading?.index)
  .replaceAll(/<!--[\s\S]*?-->/g, '')
  .trim();

if (section) {
  console.error(
    `The description has open decisions:\n\n${section}\n\nOnce they're answered, record the answers elsewhere in the description and delete the "Decisions needed" section.`,
  );
  process.exit(1);
}
console.log('The "Decisions needed" section is empty.');
