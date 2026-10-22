
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
const PAGE = { left: 50, right: 545, width: 495, top: 84, bottom: 772 };


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

// this draws the ISC logo: a black rounded square with "ISC." in white, like the website:
// it is drawn with shapes and text, so it stays sharp at any zoom and needs no image file:
function drawLogo(doc, x, y, size) {
  doc.roundedRect(x, y, size, size, size * 0.16).fillColor('#000000').fill();
  doc.font('Helvetica-Bold').fontSize(size * 0.4).fillColor('#ffffff')
     .text('ISC.', x, y + size * 0.32, { width: size, align: 'center', lineBreak: false, characterSpacing: -0.3 });
}

// this draws the logo with the name and tagline beside it:
function drawBrand(doc, x, y, logoSize, nameSize) {
  drawLogo(doc, x, y, logoSize);
  const textX = x + logoSize + 10;
  doc.font('Helvetica-Bold').fontSize(nameSize).fillColor(COLOURS.navy)
     .text('ISC Audit', textX, y + logoSize * 0.12, { lineBreak: false });
  doc.font('Helvetica').fontSize(nameSize * 0.55).fillColor(COLOURS.grey)
     .text('International Student Compliance Audit', textX, y + logoSize * 0.12 + nameSize + 3, { lineBreak: false });
}

// this draws the big letterhead on the first page: logo on the left, document details on the right:
function drawLetterhead(doc, { documentType, reference, issuedAt }) {
  drawBrand(doc, PAGE.left, 40, 42, 16);

  // the right side says what this document is and when it was made:
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOURS.grey)
     .text(documentType.toUpperCase(), PAGE.left, 43, { width: PAGE.width, align: 'right', characterSpacing: 1, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOURS.navy)
     .text(reference, PAGE.left, 56, { width: PAGE.width, align: 'right', lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(COLOURS.grey)
     .text(`Issued ${formatDay(issuedAt)}`, PAGE.left, 69, { width: PAGE.width, align: 'right', lineBreak: false });

  // a strong navy line separates the letterhead from the content:
  doc.moveTo(PAGE.left, 98).lineTo(PAGE.right, 98).lineWidth(1.5).strokeColor(COLOURS.navy).stroke();
  doc.x = PAGE.left;
  doc.y = 122;
}

// this draws the smaller header on every page after the first:
function drawRunningHeader(doc, documentType, reference) {
  drawBrand(doc, PAGE.left, 28, 22, 10);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOURS.navy)
     .text(documentType, PAGE.left, 31, { width: PAGE.width, align: 'right', lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor(COLOURS.lightGrey)
     .text(reference, PAGE.left, 42, { width: PAGE.width, align: 'right', lineBreak: false });
  doc.moveTo(PAGE.left, 62).lineTo(PAGE.right, 62).lineWidth(0.75).strokeColor(COLOURS.border).stroke();
  doc.x = PAGE.left;
  doc.y = PAGE.top;
}

// this puts the letterhead on page one and the small header on every page added later:
function useHeaders(doc, details) {
  drawLetterhead(doc, details);
  doc.on('pageAdded', () => drawRunningHeader(doc, details.documentType, details.reference));
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
    doc.moveTo(PAGE.left, 792).lineTo(PAGE.right, 792).lineWidth(0.75).strokeColor(COLOURS.border).stroke();

    // left: who made it, middle: a privacy reminder, right: the page number:
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOURS.grey)
       .text('ISC Audit', PAGE.left, 800, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOURS.lightGrey)
       .text('Confidential: contains personal data', PAGE.left, 800, { width: PAGE.width, align: 'center', lineBreak: false })
       .text(`Page ${i - range.start + 1} of ${range.count}`, PAGE.left, 800, { width: PAGE.width, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(COLOURS.lightGrey)
       .text(`Reference ${reference}   |   Generated ${formatMoment(generatedAt)} (UK time)`, PAGE.left, 811, { width: PAGE.width, lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
}

// this is the title block on the first page: a small label, the title and a subtitle:
function drawTitle(doc, eyebrow, title, subtitle) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOURS.grey)
     .text(eyebrow.toUpperCase(), PAGE.left, doc.y, { width: PAGE.width, characterSpacing: 1.2 });
  doc.moveDown(0.35);
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOURS.navy)
     .text(title, PAGE.left, doc.y, { width: PAGE.width });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10.5).fillColor(COLOURS.grey)
       .text(subtitle, PAGE.left, doc.y, { width: PAGE.width });
  }
  doc.moveDown(1.1);
}

// this draws a light strip of facts under the title, like "Prepared for" and "Period":
function drawMetaStrip(doc, items) {
  const height = 44;
  const columnWidth = PAGE.width / items.length;
  ensureSpace(doc, height + 12);
  const y = doc.y;
  doc.rect(PAGE.left, y, PAGE.width, height).fillColor(COLOURS.panelLight).fill();
  doc.moveTo(PAGE.left, y).lineTo(PAGE.right, y).lineWidth(0.75).strokeColor(COLOURS.border).stroke();
  doc.moveTo(PAGE.left, y + height).lineTo(PAGE.right, y + height).lineWidth(0.75).strokeColor(COLOURS.border).stroke();

  // each fact gets a small grey label and a bold value:
  items.forEach(([label, value], index) => {
    const x = PAGE.left + index * columnWidth + 12;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLOURS.grey)
       .text(label.toUpperCase(), x, y + 10, { width: columnWidth - 20, characterSpacing: 0.8, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOURS.navy)
       .text(String(value), x, y + 23, { width: columnWidth - 20, lineBreak: false, ellipsis: true });
  });
  doc.y = y + height + 16;
  doc.x = PAGE.left;
}

// this draws a section heading with its number in a small navy square:
// it needs room for the heading, its intro and the first rows, so a heading is never left alone at the bottom:
function drawSectionHeading(doc, number, title, intro = null) {
  ensureSpace(doc, 140);
  doc.moveDown(0.8);
  const y = doc.y;
  let textX = PAGE.left;
  if (number) {
    doc.rect(PAGE.left, y - 1, 18, 18).fillColor(COLOURS.navy).fill();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
       .text(String(number), PAGE.left, y + 3.5, { width: 18, align: 'center', lineBreak: false });
    textX = PAGE.left + 28;
  }
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOURS.navy)
     .text(title, textX, y, { width: PAGE.right - textX });

  // a thin grey line under the heading keeps sections apart without being heavy:
  const lineY = Math.max(doc.y, y + 18) + 5;
  doc.moveTo(PAGE.left, lineY).lineTo(PAGE.right, lineY).lineWidth(0.75).strokeColor(COLOURS.border).stroke();
  doc.x = PAGE.left;
  doc.y = lineY + 9;
  if (intro) {
    drawParagraph(doc, intro, { colour: COLOURS.grey, size: 9, gap: 0.7 });
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
    const height = Math.max(doc.heightOfString(shown, { width: valueWidth - 10 }), 12) + 9;
    ensureSpace(doc, height);
    const y = doc.y;

    // the label is grey and the value is dark, with a faint line under each row:
    doc.font('Helvetica').fontSize(9).fillColor(COLOURS.grey).text(label, PAGE.left, y + 4.5, { width: labelWidth - 10 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOURS.text).text(shown, PAGE.left + labelWidth, y + 4, { width: valueWidth - 10 });
    doc.moveTo(PAGE.left, y + height).lineTo(PAGE.right, y + height).lineWidth(0.5).strokeColor(COLOURS.border).stroke();
    doc.y = y + height;
  });
  doc.x = PAGE.left;
  doc.moveDown(0.6);
}

// this draws a grey box with a navy edge, used for statements and notes:
function drawNote(doc, text, title = null) {
  const innerWidth = PAGE.width - 28;
  doc.font('Helvetica').fontSize(9);
  let height = doc.heightOfString(text, { width: innerWidth, lineGap: 2 }) + 22;
  if (title) height += 14;
  ensureSpace(doc, height + 6);
  const y = doc.y;
  doc.rect(PAGE.left, y, PAGE.width, height).fillColor(COLOURS.panelLight).fill();
  doc.rect(PAGE.left, y, 3, height).fillColor(COLOURS.navy).fill();

  // the title is bold, the text under it is normal:
  let textY = y + 11;
  if (title) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOURS.navy).text(title, PAGE.left + 16, textY, { width: innerWidth });
    textY += 14;
  }
  doc.font('Helvetica').fontSize(9).fillColor(COLOURS.text).text(text, PAGE.left + 16, textY, { width: innerWidth, lineGap: 2 });
  doc.y = y + height + 10;
  doc.x = PAGE.left;
}

// this draws a row of summary boxes, like "Weekly limit today: 20 hours":
// each box is white with a thin border and a navy line on top:
function drawSummaryCards(doc, cards) {
  const gap = 10;
  const cardWidth = (PAGE.width - gap * (cards.length - 1)) / cards.length;
  const height = 62;
  ensureSpace(doc, height + 12);
  const y = doc.y;
  cards.forEach(([label, value], index) => {
    const x = PAGE.left + index * (cardWidth + gap);
    doc.rect(x, y, cardWidth, height).lineWidth(0.75).strokeColor(COLOURS.border).stroke();
    doc.rect(x, y, cardWidth, 3).fillColor(COLOURS.navy).fill();
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLOURS.grey)
       .text(label.toUpperCase(), x + 11, y + 14, { width: cardWidth - 22, characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOURS.navy)
       .text(String(value), x + 11, y + 32, { width: cardWidth - 22, height: 26, ellipsis: true });
  });
  doc.y = y + height + 14;
  doc.x = PAGE.left;
}

// this draws a table with a navy header row and light stripes on every other row:
// when a table runs onto a new page, the header row is drawn again:
function drawTable(doc, columns, rows, emptyText = 'Nothing recorded yet.') {
  if (!rows || rows.length === 0) {
    drawNote(doc, emptyText);
    return;
  }
  const totalWeight = columns.reduce((sum, col) => sum + col.width, 0);
  const widths = columns.map((col) => (col.width / totalWeight) * PAGE.width);
  const padding = 6;

  // the header row grows if a column name needs two lines, so text never spills out:
  doc.font('Helvetica-Bold').fontSize(7.5);
  const headerHeight = Math.max(...columns.map((col, i) => doc.heightOfString(col.header.toUpperCase(), { width: widths[i] - padding * 2, characterSpacing: 0.4 }))) + 15;

  // this draws the header row and moves below it:
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(PAGE.left, y, PAGE.width, headerHeight).fillColor(COLOURS.navy).fill();
    let x = PAGE.left;
    columns.forEach((col, i) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
         .text(col.header.toUpperCase(), x + padding, y + 7.5, { width: widths[i] - padding * 2, characterSpacing: 0.4 });
      x += widths[i];
    });
    doc.y = y + headerHeight;
  };

  ensureSpace(doc, headerHeight + 32);
  drawHeader();
  rows.forEach((row, rowIndex) => {
    // the tallest cell decides how tall this row is:
    doc.font('Helvetica').fontSize(8.5);
    const cellHeights = columns.map((col, i) => doc.heightOfString(String(row[col.key] ?? ''), { width: widths[i] - padding * 2 }));
    const height = Math.max(...cellHeights, 10) + padding * 2;
    if (doc.y + height > PAGE.bottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;

    // every other row gets a light grey stripe so long tables are easy to follow:
    if (rowIndex % 2 === 1) {
      doc.rect(PAGE.left, y, PAGE.width, height).fillColor(COLOURS.panelLight).fill();
    }
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
  doc.moveDown(0.9);
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
    { header: 'Confirmed', key: 'confirmed', width: 1.4 },
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
    { header: 'When', key: 'when', width: 1.2, muted: true },
    { header: 'What happened', key: 'event', width: 1.6, bold: true },
    { header: 'Details', key: 'details', width: 2.4 },
    { header: 'By', key: 'by', width: 1.4 },
    { header: 'IP address', key: 'ip', width: 1, muted: true },
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
  useHeaders(doc, { documentType: 'Student Compliance Audit Pack', reference: pack.reference, issuedAt: pack.generatedAt });

  // first page: who this is about and where things stand today:
  drawTitle(doc, 'Compliance evidence', 'Compliance Audit Pack', 'A record of the term dates this student declared and the employers who acknowledged them.');
  drawMetaStrip(doc, [
    ['Student', pack.student.name],
    ['University ID', pack.student.universityId],
    ['University', pack.student.universityName || 'Not given'],
    ['Issued', formatDay(pack.generatedAt)],
  ]);
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
  drawSectionHeading(doc, 4, 'Activity history', 'Every change and decision recorded for this student, in date order. Times are UK time.');
  drawHistoryTable(doc, pack.history, pack.counts.events);

  drawDisclaimer(doc, pack.disclaimer);
  drawFooters(doc, pack.reference, pack.generatedAt);
  doc.end();
  return finished;
}


// Generate Employer Relationship Audit Pack PDF:
export async function generateRelationshipAuditPackPDF(pack) {
  const { doc, finished } = startDocument('Employer Compliance Audit Pack');
  useHeaders(doc, { documentType: 'Employer Compliance Audit Pack', reference: pack.reference, issuedAt: pack.generatedAt });

  // first page: which employer and student this pack is about:
  drawTitle(doc, 'Compliance evidence', 'Compliance Audit Pack', 'A record of the term dates this student shared with you and what you acknowledged.');
  drawMetaStrip(doc, [
    ['Prepared for', pack.employer.organisation || pack.employer.name],
    ['Student', pack.student.name],
    ['University ID', pack.student.universityId],
    ['Issued', formatDay(pack.generatedAt)],
  ]);
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
  drawSectionHeading(doc, 4, 'Activity history', 'Requests, decisions, acknowledgements and term changes for this student, in date order. Times are UK time.');
  drawHistoryTable(doc, pack.history, pack.counts.events);

  drawDisclaimer(doc, pack.disclaimer);
  drawFooters(doc, pack.reference, pack.generatedAt);
  doc.end();
  return finished;
}


// Generate Term Letter PDF for Students as its v important for my app:
// A professional letter that students can share with employers:
// options.addressee is the employer's organisation when an employer downloads it:
// options.unconfirmedCount says how many terms were left out because they are not confirmed:
export async function generateTermLetterPDF(student, terms, options = {}) {
  const { addressee = null, unconfirmedCount = 0 } = options;
  const generatedAt = new Date();
  const reference = `ISC-L-${student.universityId}-${generatedAt.toISOString().slice(0, 10).replace(/-/g, '')}`;
  const { doc, finished } = startDocument('Term Dates Letter');
  useHeaders(doc, { documentType: 'Term Dates Letter', reference, issuedAt: generatedAt });

  const studentName = student.fullName || student.user?.email || 'The student';
  const universityName = student.universityName || 'their university';

  // the letter opens with its title and who it is about the date is in the letterhead:
  drawTitle(doc, 'Student visa working hours', 'Confirmation of Term Dates', `For ${studentName}, ${universityName}`);
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
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLOURS.navy).text('Confirmed term dates', PAGE.left, doc.y);
  doc.moveDown(0.6);
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

  // the sign off uses the logo like a company letter:
  drawParagraph(doc, 'Yours faithfully,', { size: 10, gap: 0.8 });
  ensureSpace(doc, 40);
  drawBrand(doc, PAGE.left, doc.y, 30, 12);
  doc.y += 40;

  drawFooters(doc, reference, generatedAt);
  doc.end();
  return finished;
}
