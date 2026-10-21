
// PDF Generator Utility for Audit Pack Exports
// Generates professional PDF documents for Home Office compliance:
// every PDF uses the same small drawing kit below, so they all look like one product:

import PDFDocument from 'pdfkit';

// these are the app's navy and grey colours, the same ones the website uses:
const COLOURS = {
  navy: '#1f2937',
  text: '#111827',
  grey: '#6b7280',
  lightGrey: '#9ca3af',
  border: '#e5e7eb',
  panel: '#f3f4f6',
  panelLight: '#f9fafb',
};

// A4 page size and the area we write inside:
const PAGE = { left: 50, right: 545, width: 495, top: 72, bottom: 780 };


// DATE HELPERS:

// term dates are saved as midnight UTC, so we show them in UTC to stop them moving a day:
export function formatDay(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// real moments (like "acknowledged at") are shown in UK time with the hour:
export function formatMoment(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  return `${day}, ${time}`;
}


// DRAWING KIT:

// this starts a PDF and collects it into one Buffer when it is finished:
// bufferPages lets us go back at the end and write "Page 1 of 4" on every page:
function startDocument(title) {
  const doc = new PDFDocument({
    size: 'A4',
    bufferPages: true,
    margins: { top: PAGE.top, bottom: 842 - PAGE.bottom, left: PAGE.left, right: 595 - PAGE.right },
    info: { Title: title, Author: 'ISC Audit', Creator: 'ISC Audit' },
  });
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
  return { doc, finished };
}

// this draws the thin header at the top of every page:
function drawRunningHeader(doc, title) {
  const savedY = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOURS.navy)
     .text('ISC Audit', PAGE.left, 34, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(COLOURS.grey)
     .text(title, PAGE.left, 35.5, { width: PAGE.width, align: 'right', lineBreak: false });
  doc.moveTo(PAGE.left, 52).lineTo(PAGE.right, 52).lineWidth(0.75).strokeColor(COLOURS.border).stroke();
  doc.y = Math.max(savedY, PAGE.top);
  doc.x = PAGE.left;
}

// this adds the header to the first page and to every page added later:
function useRunningHeader(doc, title) {
  drawRunningHeader(doc, title);
  doc.on('pageAdded', () => drawRunningHeader(doc, title));
}

// this moves to a new page when the next block will not fit:
function ensureSpace(doc, height) {
  if (doc.y + height > PAGE.bottom) {
    doc.addPage();
  }
}

// this writes the footer on every page once all pages exist:
// the bottom margin is set to 0 while writing, otherwise PDFKit would add a blank page:
function drawFooters(doc, reference, generatedAt) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.moveTo(PAGE.left, 800).lineTo(PAGE.right, 800).lineWidth(0.75).strokeColor(COLOURS.border).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOURS.lightGrey)
       .text(`Reference ${reference}   |   Generated ${formatMoment(generatedAt)} (UK time)`, PAGE.left, 808, { width: PAGE.width, lineBreak: false })
       .text(`Page ${i - range.start + 1} of ${range.count}`, PAGE.left, 808, { width: PAGE.width, align: 'right', lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
}

// this is the big title block at the top of the first page:
function drawTitle(doc, title, subtitle) {
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLOURS.navy)
     .text(title, PAGE.left, PAGE.top, { width: PAGE.width });
  if (subtitle) {
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(11).fillColor(COLOURS.grey)
       .text(subtitle, { width: PAGE.width });
  }
  doc.moveDown(1.2);
}

// this draws a numbered section heading with a thin line under it:
function drawSectionHeading(doc, number, title, intro = null) {
  ensureSpace(doc, 80);
  doc.moveDown(0.6);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOURS.navy)
     .text(number ? `${number}. ${title}` : title, PAGE.left, y, { width: PAGE.width });
  const lineY = doc.y + 3;
  doc.moveTo(PAGE.left, lineY).lineTo(PAGE.right, lineY).lineWidth(1).strokeColor(COLOURS.navy).stroke();
  doc.y = lineY + 8;
  if (intro) {
    drawParagraph(doc, intro, { colour: COLOURS.grey, size: 9 });
  }
}

// this writes a normal paragraph of text:
function drawParagraph(doc, text, { colour = COLOURS.text, size = 9.5, bold = false, gap = 0.5 } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  ensureSpace(doc, doc.heightOfString(text, { width: PAGE.width, lineGap: 2 }) + 4);
  doc.fillColor(colour).text(text, PAGE.left, doc.y, { width: PAGE.width, lineGap: 2 });
  doc.moveDown(gap);
}

// this draws label and value pairs in two neat columns:
function drawDetails(doc, rows, labelWidth = 150) {
  const valueWidth = PAGE.width - labelWidth;
  rows.forEach(([label, value]) => {
    const shown = value === null || value === undefined || value === '' ? 'Not provided' : String(value);
    doc.font('Helvetica').fontSize(9.5);
    const height = Math.max(doc.heightOfString(shown, { width: valueWidth }), 12) + 7;
    ensureSpace(doc, height);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(COLOURS.grey).text(label, PAGE.left, y + 3, { width: labelWidth - 10 });
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOURS.text).text(shown, PAGE.left + labelWidth, y + 3, { width: valueWidth });
    doc.moveTo(PAGE.left, y + height).lineTo(PAGE.right, y + height).lineWidth(0.5).strokeColor(COLOURS.border).stroke();
    doc.y = y + height;
  });
  doc.x = PAGE.left;
  doc.moveDown(0.6);
}

// this draws a grey box with a navy edge, used for statements and notes:
function drawNote(doc, text, title = null) {
  const innerWidth = PAGE.width - 24;
  doc.font('Helvetica').fontSize(9);
  let height = doc.heightOfString(text, { width: innerWidth, lineGap: 2 }) + 18;
  if (title) height += 14;
  ensureSpace(doc, height + 6);
  const y = doc.y;
  doc.rect(PAGE.left, y, PAGE.width, height).fillColor(COLOURS.panelLight).fill();
  doc.rect(PAGE.left, y, 3, height).fillColor(COLOURS.navy).fill();
  let textY = y + 9;
  if (title) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOURS.navy).text(title, PAGE.left + 14, textY, { width: innerWidth });
    textY += 14;
  }
  doc.font('Helvetica').fontSize(9).fillColor(COLOURS.text).text(text, PAGE.left + 14, textY, { width: innerWidth, lineGap: 2 });
  doc.y = y + height + 8;
  doc.x = PAGE.left;
}

// this draws a row of summary boxes, like "Weekly limit now: 20 hours":
function drawSummaryCards(doc, cards) {
  const gap = 8;
  const cardWidth = (PAGE.width - gap * (cards.length - 1)) / cards.length;
  const height = 58;
  ensureSpace(doc, height + 10);
  const y = doc.y;
  cards.forEach(([label, value], index) => {
    const x = PAGE.left + index * (cardWidth + gap);
    doc.rect(x, y, cardWidth, height).fillColor(COLOURS.panel).fill();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOURS.grey).text(label.toUpperCase(), x + 10, y + 10, { width: cardWidth - 20 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOURS.navy).text(String(value), x + 10, y + 26, { width: cardWidth - 20, height: 28, ellipsis: true });
  });
  doc.y = y + height + 12;
  doc.x = PAGE.left;
}

// this draws a table with a grey header row:
// when a table runs onto a new page, the header row is drawn again:
function drawTable(doc, columns, rows, emptyText = 'Nothing recorded yet.') {
  if (!rows || rows.length === 0) {
    drawParagraph(doc, emptyText, { colour: COLOURS.grey, size: 9 });
    return;
  }
  const totalWeight = columns.reduce((sum, col) => sum + col.width, 0);
  const widths = columns.map((col) => (col.width / totalWeight) * PAGE.width);
  const padding = 5;

  // this draws the header row and returns where the first row starts:
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(PAGE.left, y, PAGE.width, 20).fillColor(COLOURS.panel).fill();
    let x = PAGE.left;
    columns.forEach((col, i) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOURS.navy)
         .text(col.header, x + padding, y + 6, { width: widths[i] - padding * 2, lineBreak: false, ellipsis: true });
      x += widths[i];
    });
    doc.y = y + 20;
  };

  ensureSpace(doc, 50);
  drawHeader();
  rows.forEach((row) => {
    // the tallest cell decides how tall this row is:
    doc.font('Helvetica').fontSize(8.5);
    const cellHeights = columns.map((col, i) => doc.heightOfString(String(row[col.key] ?? ''), { width: widths[i] - padding * 2 }));
    const height = Math.max(...cellHeights, 10) + padding * 2;
    if (doc.y + height > PAGE.bottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = PAGE.left;
    columns.forEach((col, i) => {
      doc.font(col.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(col.muted ? COLOURS.grey : COLOURS.text)
         .text(String(row[col.key] ?? ''), x + padding, y + padding, { width: widths[i] - padding * 2 });
      x += widths[i];
    });
    doc.moveTo(PAGE.left, y + height).lineTo(PAGE.right, y + height).lineWidth(0.5).strokeColor(COLOURS.border).stroke();
    doc.y = y + height;
  });
  doc.x = PAGE.left;
  doc.moveDown(0.8);
}


// SHARED SECTIONS:

// this shows the term dates table used by both audit packs:
function drawTermsTable(doc, terms) {
  drawTable(doc, [
    { header: 'Term', key: 'name', width: 1.1, bold: true },
    { header: 'Academic year', key: 'academicYear', width: 1 },
    { header: 'Starts', key: 'start', width: 1.3 },
    { header: 'Ends', key: 'end', width: 1.3 },
    { header: 'Weekly limit', key: 'limit', width: 1 },
    { header: 'Student confirmed', key: 'confirmed', width: 1.4 },
  ], terms.map((term) => ({
    name: term.name,
    academicYear: term.academicYear || 'Not set',
    start: formatDay(term.startDate),
    end: formatDay(term.endDate),
    limit: `${term.weeklyLimit} hours`,
    confirmed: term.confirmedAt ? formatMoment(term.confirmedAt) : 'Not confirmed yet',
  })), 'The student has not added any term dates yet.');
}

// this shows the dated history table used by both audit packs:
function drawHistoryTable(doc, history, totalEvents) {
  drawTable(doc, [
    { header: 'When (UK time)', key: 'when', width: 1.2, muted: true },
    { header: 'What happened', key: 'event', width: 1.6, bold: true },
    { header: 'Details', key: 'details', width: 2.4 },
    { header: 'By', key: 'by', width: 1.4 },
    { header: 'IP address', key: 'ip', width: 0.9, muted: true },
  ], history.map((item) => ({
    when: formatMoment(item.at),
    event: item.event,
    details: item.details || '',
    by: item.by,
    ip: item.ip || 'Not recorded',
  })), 'No activity recorded yet.');
  if (totalEvents > history.length) {
    drawParagraph(doc, `Showing the latest ${history.length} of ${totalEvents} recorded events. The full list is in the JSON export.`, { colour: COLOURS.grey, size: 8.5 });
  }
}

// this ends every audit pack with the disclaimer:
function drawDisclaimer(doc, disclaimer) {
  drawSectionHeading(doc, null, 'About this document');
  drawNote(doc, disclaimer);
}


// Generate Student Audit Pack PDF:
export async function generateStudentAuditPackPDF(pack) {
  const { doc, finished } = startDocument('Student Compliance Audit Pack');
  useRunningHeader(doc, 'Student Compliance Audit Pack');

  // first page: who this is about and where things stand today:
  drawTitle(doc, 'Compliance Audit Pack', `${pack.student.name}  |  ${pack.student.universityName || 'University not given'}  |  ID ${pack.student.universityId}`);
  drawSummaryCards(doc, [
    ['Status today', pack.currentRule.statusLabel],
    ['Weekly limit today', pack.currentRule.limitLabel],
    ['Terms confirmed', `${pack.counts.confirmedTerms} of ${pack.counts.terms}`],
    ['Acknowledged by', `${pack.counts.acknowledged} of ${pack.counts.activeEmployers} employers`],
  ]);
  drawNote(doc, pack.currentRule.reason, 'The rule that applies today');

  // section 1: the student's identity:
  drawSectionHeading(doc, 1, 'Student details');
  drawDetails(doc, [
    ['Full name', pack.student.name],
    ['Email address', pack.student.email],
    ['University', pack.student.universityName],
    ['University ID', pack.student.universityId],
    ['Visa type', pack.student.visaType],
    ['Course end date', formatDay(pack.student.courseEndDate)],
    ['Own weekly limit', pack.student.maxWeeklyHours ? `${pack.student.maxWeeklyHours} hours (only used when lower than the legal limit)` : 'None set'],
  ]);

  // section 2: the term dates the student gave us:
  drawSectionHeading(doc, 2, 'Term dates declared by the student',
    'The student enters these dates and confirms them. Outside these dates the student is on holiday and may work full time, unless their own limit is lower.');
  drawTermsTable(doc, pack.terms);

  // section 3: which employers have acknowledged those dates:
  drawSectionHeading(doc, 3, 'Employer acknowledgements',
    'An employer acknowledges the term dates to confirm they have read them. If the dates change afterwards, the acknowledgement is cleared and the employer must acknowledge again.');
  drawTable(doc, [
    { header: 'Employer', key: 'employer', width: 1.8, bold: true },
    { header: 'Work email', key: 'email', width: 1.6 },
    { header: 'Acknowledgement', key: 'status', width: 2.2 },
  ], pack.employers.map((emp) => ({
    employer: emp.organisation ? `${emp.name}, ${emp.organisation}` : emp.name,
    email: emp.workEmail || 'Not provided',
    status: emp.acknowledgedAt
      ? `Acknowledged ${formatMoment(emp.acknowledgedAt)}`
      : emp.resetAt
        ? `Cleared ${formatMoment(emp.resetAt)} because the term dates changed. Waiting for the employer to acknowledge again.`
        : 'Waiting for the employer to acknowledge',
  })), 'No employer has access to this student yet.');
  drawNote(doc, `"${pack.acknowledgementText}"`, 'What an employer agrees to when they acknowledge');

  // section 4: everything that happened, newest last:
  drawSectionHeading(doc, 4, 'Activity history', 'Every change and decision recorded for this student, in date order.');
  drawHistoryTable(doc, pack.history, pack.counts.events);

  drawDisclaimer(doc, pack.disclaimer);
  drawFooters(doc, pack.reference, pack.generatedAt);
  doc.end();
  return finished;
}


// Generate Employer Relationship Audit Pack PDF:
export async function generateRelationshipAuditPackPDF(pack) {
  const { doc, finished } = startDocument('Employer Compliance Audit Pack');
  useRunningHeader(doc, 'Employer Compliance Audit Pack');

  // first page: which employer and student this pack is about:
  drawTitle(doc, 'Compliance Audit Pack', `${pack.employer.organisation || pack.employer.name}  |  Student ${pack.student.name} (${pack.student.universityId})`);
  drawSummaryCards(doc, [
    ['Status today', pack.currentRule.statusLabel],
    ['Weekly limit today', pack.currentRule.limitLabel],
    ['Access', pack.relationship.statusLabel],
    ['Acknowledgement', pack.relationship.acknowledgedAt ? 'Up to date' : 'Needed'],
  ]);
  drawNote(doc, pack.currentRule.reason, 'The rule that applies today');

  // section 1: the two people this record is between:
  drawSectionHeading(doc, 1, 'Who this record covers');
  drawDetails(doc, [
    ['Employer', pack.employer.name],
    ['Organisation', pack.employer.organisation],
    ['Job role', pack.employer.role],
    ['Work email', pack.employer.workEmail],
    ['Student', pack.student.name],
    ['University', pack.student.universityName],
    ['University ID', pack.student.universityId],
    ['Visa type', pack.student.visaType],
    ['Course end date', formatDay(pack.student.courseEndDate)],
    ['Access requested', formatMoment(pack.relationship.linkedAt)],
    ['Access status', pack.relationship.statusLabel],
  ]);

  // section 2: the dates the student declared:
  drawSectionHeading(doc, 2, 'Term dates declared by the student',
    'These are the dates as they are today. Outside these dates the student is on holiday and may work full time, unless their own limit is lower.');
  drawTermsTable(doc, pack.terms);

  // section 3: what the employer agreed to and when:
  drawSectionHeading(doc, 3, 'Employer acknowledgement');
  if (pack.relationship.acknowledgedAt) {
    drawDetails(doc, [
      ['Acknowledged by', pack.relationship.acknowledgedByName],
      ['Acknowledged at', `${formatMoment(pack.relationship.acknowledgedAt)} (UK time)`],
    ]);
    drawNote(doc, `"${pack.relationship.acknowledgementText}"`, 'Statement the employer agreed to');
    if (pack.relationship.acknowledgedTerms?.length) {
      drawParagraph(doc, 'Term dates shown to the employer when they acknowledged:', { bold: true, size: 9 });
      drawTable(doc, [
        { header: 'Term', key: 'name', width: 1, bold: true },
        { header: 'Academic year', key: 'academicYear', width: 1 },
        { header: 'Starts', key: 'start', width: 1.3 },
        { header: 'Ends', key: 'end', width: 1.3 },
      ], pack.relationship.acknowledgedTerms.map((term) => ({
        name: term.name,
        academicYear: term.academicYear || 'Not set',
        start: formatDay(term.startDate),
        end: formatDay(term.endDate),
      })));
    }
  } else if (pack.relationship.resetAt) {
    drawNote(doc, `The employer's earlier acknowledgement was cleared on ${formatMoment(pack.relationship.resetAt)} because the term dates changed (${pack.relationship.resetReason || 'term dates updated'}). The employer has not acknowledged the new dates yet.`, 'Acknowledgement needed');
  } else {
    drawNote(doc, 'The employer has not acknowledged the student\'s term dates yet.', 'Acknowledgement needed');
  }

  // section 4: the dated history of this link:
  drawSectionHeading(doc, 4, 'Activity history', 'Requests, decisions, acknowledgements and term changes for this student, in date order.');
  drawHistoryTable(doc, pack.history, pack.counts.events);

  drawDisclaimer(doc, pack.disclaimer);
  drawFooters(doc, pack.reference, pack.generatedAt);
  doc.end();
  return finished;
}


// Generate Term Letter PDF for Students
// A professional letter that students can share with employers:
// options.addressee is the employer's organisation when an employer downloads it:
// options.unconfirmedCount says how many terms were left out because they are not confirmed:
export async function generateTermLetterPDF(student, terms, options = {}) {
  const { addressee = null, unconfirmedCount = 0 } = options;
  const generatedAt = new Date();
  const reference = `ISC-L-${student.universityId}-${generatedAt.toISOString().slice(0, 10).replace(/-/g, '')}`;
  const { doc, finished } = startDocument('Term Dates Letter');
  useRunningHeader(doc, 'Term Dates Letter');

  const studentName = student.fullName || student.user?.email || 'The student';
  const universityName = student.universityName || 'their university';

  // the letter opens with the date and who it is for:
  doc.font('Helvetica').fontSize(10).fillColor(COLOURS.grey)
     .text(formatDay(generatedAt), PAGE.left, PAGE.top, { width: PAGE.width, align: 'right' });
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOURS.navy).text('Confirmation of Term Dates', PAGE.left, doc.y, { width: PAGE.width });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor(COLOURS.grey).text(`For ${studentName}, ${universityName}`, { width: PAGE.width });
  doc.moveDown(1.4);
  drawParagraph(doc, addressee ? `To ${addressee},` : 'To whom it may concern,', { size: 10, gap: 0.8 });
  drawParagraph(doc,
    `This letter sets out the academic term dates that ${studentName} has declared and confirmed in ISC Audit. ` +
    'You can use these dates to plan the student\'s working hours in line with their Student visa conditions.',
    { size: 10, gap: 1 });

  // the student's details in a neat block:
  drawDetails(doc, [
    ['Student', studentName],
    ['University', student.universityName],
    ['University ID', student.universityId],
    ['Visa type', student.visaType],
    ['Course end date', formatDay(student.courseEndDate)],
  ], 130);

  // this shows every confirmed term with its weekly limit:
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOURS.navy).text('Confirmed term dates', PAGE.left, doc.y);
  doc.moveDown(0.5);
  const sortedTerms = [...terms].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  drawTable(doc, [
    { header: 'Term', key: 'name', width: 1, bold: true },
    { header: 'Academic year', key: 'academicYear', width: 1 },
    { header: 'Starts', key: 'start', width: 1.3 },
    { header: 'Ends', key: 'end', width: 1.3 },
    { header: 'Weekly limit', key: 'limit', width: 1 },
  ], sortedTerms.map((term) => ({
    // this shows AUTUMN as Autumn:
    name: term.name.charAt(0) + term.name.slice(1).toLowerCase(),
    academicYear: term.academicYear || 'Not set',
    start: formatDay(term.startDate),
    end: formatDay(term.endDate),
    limit: term.courseLevel === 'BELOW_DEGREE' ? '10 hours' : '20 hours',
  })), 'No confirmed term dates available.');

  // this tells the reader if some terms are missing because they are not confirmed:
  if (unconfirmedCount > 0) {
    drawNote(doc,
      `${unconfirmedCount} more term${unconfirmedCount === 1 ? ' has' : 's have'} been added by the student but not confirmed yet, so ${unconfirmedCount === 1 ? 'it is' : 'they are'} not included in this letter.`,
      'Terms not included');
  }

  // the working rules in plain words:
  drawNote(doc,
    'During term time, a student on a Student visa may work up to 20 hours a week (10 hours a week if their course is below degree level). ' +
    'Outside term time, during official vacations, they may work full time. After the course end date they may not work on this visa. ' +
    (student.maxWeeklyHours ? `The student has also set their own lower limit of ${student.maxWeeklyHours} hours a week where that is stricter.` : ''),
    'Working hour limits');

  drawParagraph(doc,
    'These dates were declared by the student. They are not a letter from the university. Please check them against the university\'s published term dates if you are unsure.',
    { colour: COLOURS.grey, size: 8.5, gap: 1.2 });

  drawParagraph(doc, 'Yours faithfully,', { size: 10, gap: 0.3 });
  drawParagraph(doc, 'ISC Audit', { size: 10, bold: true, gap: 0 });
  drawParagraph(doc, 'International Student Compliance Audit', { colour: COLOURS.grey, size: 9 });

  drawFooters(doc, reference, generatedAt);
  doc.end();
  return finished;
}
