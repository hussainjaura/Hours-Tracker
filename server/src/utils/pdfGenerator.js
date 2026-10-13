
// PDF Generator Utility for Audit Pack Exports
// Generates professional PDF documents for Home Office compliance:

import PDFDocument from 'pdfkit';

// Format date for PDF display:
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Add header to PDF page:
function addHeader(doc, title, subtitle = null) {
  doc.fontSize(20)
     .fillColor('#8b5cf6')
     .text(title, 50, 50, { align: 'left' });
  
  if (subtitle) {
    doc.fontSize(12)
       .fillColor('#6b7280')
       .text(subtitle, 50, 80, { align: 'left' });
  }
  
  // Add line separator
  doc.moveTo(50, 110)
     .lineTo(550, 110)
     .strokeColor('#e5e7eb')
     .lineWidth(1)
     .stroke();
  // Return Y position after header
  return 130;
}

// Add section title:
function addSectionTitle(doc, y, title, number = null) {
  const sectionTitle = number ? `${number}. ${title}` : title;
  doc.fontSize(16)
     .fillColor('#1f2937')
     .text(sectionTitle, 50, y, { align: 'left' });
  
  // Add underline
  const textWidth = doc.widthOfString(sectionTitle);
  doc.moveTo(50, y + 20)
     .lineTo(50 + textWidth, y + 20)
     .strokeColor('#8b5cf6')
     .lineWidth(2)
     .stroke();
  
  return y + 40;
}

// Add key-value pair:
function addKeyValue(doc, y, key, value, maxWidth = 200) {
  doc.fontSize(10)
     .fillColor('#6b7280')
     .text(key + ':', 50, y, { width: maxWidth });
  
  doc.fontSize(10)
     .fillColor('#1f2937')
     .text(value || 'N/A', 50 + maxWidth, y, { width: 450 - maxWidth });
  
  return y + 20;
}

// Add card/box with content:
function addCard(doc, y, content, options = {}) {
  const { padding = 10, backgroundColor = '#f9fafb', borderColor = '#e5e7eb' } = options;
  
  // Draw card background
  doc.rect(50, y, 500, content.height + padding * 2)
     .fillColor(backgroundColor)
     .fill()
     .strokeColor(borderColor)
     .lineWidth(1)
     .stroke();
  
  return y + content.height + padding * 2 + 10;
}


// Generate Student Audit Pack PDF:
export async function generateStudentAuditPackPDF(auditPack) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      let y = 50;
      
      // Cover Page:
      y = addHeader(doc, 'ISC Audit — International Student Compliance Audit', 'Student Audit Pack');
      
      y += 20;
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('COMPLIANCE EVIDENCE DOCUMENT', 50, y, { align: 'center' });
      
      y += 30;
      doc.fontSize(12)
         .fillColor('#6b7280')
         .text(`Generated: ${formatDate(auditPack.exportDate)}`, 50, y, { align: 'center' });
      
      y += 20;
      doc.fontSize(10)
         .fillColor('#ef4444')
         .text('IMPORTANT DISCLAIMER', 50, y, { align: 'center', bold: true });
      
      y += 15;
      doc.fontSize(9)
         .fillColor('#6b7280')
         .text(auditPack.disclaimer, 50, y, { 
           align: 'left',
           width: 500,
           lineGap: 5
         });
      
      // New Page - Layer 1: Identity & Context:
      doc.addPage();
      y = addHeader(doc, 'Audit Trail Report', `Student: ${auditPack.identity?.studentName || 'N/A'}`);
      
      y = addSectionTitle(doc, y, 'Identity & Context', 1);
      
      y += 10;
      y = addKeyValue(doc, y, 'Student Name', auditPack.identity?.studentName || 'N/A');
      y = addKeyValue(doc, y, 'University ID', auditPack.identity?.universityId || 'N/A');
      y = addKeyValue(doc, y, 'Visa Type', auditPack.identity?.visaType || 'N/A');
      y = addKeyValue(doc, y, 'Course End Date', formatDate(auditPack.identity?.courseEndDate));
      
      // New Page - Layer 2: Term Declarations:
      doc.addPage();
      y = addHeader(doc, 'Term Date Declarations', 'Student-Provided Academic Term Information');
      
      y = addSectionTitle(doc, y, 'Term Date Declarations', 2);
      
      if (auditPack.declarations && auditPack.declarations.length > 0) {
        auditPack.declarations.forEach((decl, idx) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(12)
             .fillColor('#1f2937')
             .text(`${decl.term.name} Term - ${decl.term.academicYear}`, 50, y, { bold: true });
          
          y += 20;
          y = addKeyValue(doc, y, 'Start Date', formatDate(decl.term.startDate));
          y = addKeyValue(doc, y, 'End Date', formatDate(decl.term.endDate));
          y = addKeyValue(doc, y, 'Declared', formatDate(decl.declaredAt));
          y = addKeyValue(doc, y, 'Confirmed', decl.confirmedAt ? formatDate(decl.confirmedAt) : 'Pending');
          
          if (decl.declarationText) {
            y += 10;
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text('Student Declaration:', 50, y);
            y += 15;
            doc.fontSize(9)
               .fillColor('#1f2937')
               .text(`"${decl.declarationText}"`, 60, y, { 
                 width: 480,
                 lineGap: 3
               });
            y += 30;
          }
          
          y += 10;
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No term declarations recorded.', 50, y);
      }
      
      // New Page - Layer 3: Employer Acknowledgements:
      doc.addPage();
      y = addHeader(doc, 'Employer Acknowledgements', 'Employer Confirmation of Student Declarations');
      
      y = addSectionTitle(doc, y, 'Employer Acknowledgements', 3);
      
      if (auditPack.acknowledgements && auditPack.acknowledgements.length > 0) {
        auditPack.acknowledgements.forEach((ack, idx) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(12)
             .fillColor('#1f2937')
             .text(`Organisation: ${ack.organisationName || 'Unknown Organisation'}`, 50, y, { bold: true });
          
          if (ack.employerName) {
            y += 15;
            doc.fontSize(10)
               .fillColor('#6b7280')
               .text(`Manager: ${ack.employerName}${ack.workEmail ? ` (${ack.workEmail})` : ''}`, 50, y);
          }
          
          y += 20;
          y = addKeyValue(doc, y, 'Acknowledged At', formatDate(ack.acknowledgedAt));
          
          if (ack.acknowledgementText) {
            y += 10;
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text('Employer Statement:', 50, y);
            y += 15;
            doc.fontSize(9)
               .fillColor('#1f2937')
               .text(`"${ack.acknowledgementText}"`, 60, y, { 
                 width: 480,
                 lineGap: 3
               });
            y += 30;
          }
          
          y += 10;
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No employer acknowledgements recorded.', 50, y);
      }
      
      // New Page - Layer 4: Compliance Rules:
      doc.addPage();
      y = addHeader(doc, 'Compliance Rules', 'System-Generated Work Hour Rules');
      
      y = addSectionTitle(doc, y, 'System-Generated Compliance Rules', 4);
      
      if (auditPack.complianceRules && auditPack.complianceRules.length > 0) {
        auditPack.complianceRules.forEach((rule, idx) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(11)
             .fillColor('#1f2937')
             .text(rule.action || 'Compliance Rule', 50, y, { bold: true });
          
          y += 20;
          y = addKeyValue(doc, y, 'Generated At', formatDate(rule.createdAt));
          
          if (rule.complianceRule) {
            y += 10;
            y = addKeyValue(doc, y, 'Rule Applied', rule.complianceRule.ruleApplied || 'N/A');
            y = addKeyValue(doc, y, 'Allowed Hours', `${rule.complianceRule.allowedWeeklyHours || 'N/A'}h/week`);
            y = addKeyValue(doc, y, 'Term Time Status', rule.complianceRule.inTermTime ? 'Term Time' : 'Holiday Period');
          }
          
          y += 20;
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No compliance rules generated yet.', 50, y);
      }
      
      // New Page - Layer 5: Change History:
      doc.addPage();
      y = addHeader(doc, 'Change History', 'Record of All Modifications');
      
      y = addSectionTitle(doc, y, 'Change History', 5);
      
      if (auditPack.changeHistory && auditPack.changeHistory.length > 0) {
        auditPack.changeHistory.forEach((change, idx) => {
          if (y > 650) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(11)
             .fillColor('#1f2937')
             .text(change.action || 'Change Record', 50, y, { bold: true });
          
          y += 20;
          y = addKeyValue(doc, y, 'Changed At', formatDate(change.createdAt));
          y = addKeyValue(doc, y, 'Changed By', change.performedBy || 'N/A');
          
          if (change.changeHistory) {
            y += 10;
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text('Before:', 50, y);
            y += 15;
            doc.fontSize(8)
               .fillColor('#1f2937')
               .text(JSON.stringify(change.changeHistory.before, null, 2), 60, y, { 
                 width: 480,
                 lineGap: 2
               });
            
            const beforeHeight = doc.heightOfString(JSON.stringify(change.changeHistory.before, null, 2), { width: 480 });
            y += beforeHeight + 15;
            
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text('After:', 50, y);
            y += 15;
            doc.fontSize(8)
               .fillColor('#1f2937')
               .text(JSON.stringify(change.changeHistory.after, null, 2), 60, y, { 
                 width: 480,
                 lineGap: 2
               });
            
            const afterHeight = doc.heightOfString(JSON.stringify(change.changeHistory.after, null, 2), { width: 480 });
            y += afterHeight + 20;
          }
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No changes recorded yet.', 50, y);
      }
      
      // Final Page - Summary:
      doc.addPage();
      y = addHeader(doc, 'Audit Trail Summary', 'Complete Record Summary');
      
      y += 20;
      doc.fontSize(12)
         .fillColor('#1f2937')
         .text('Summary Statistics', 50, y, { bold: true });
      
      y += 30;
      y = addKeyValue(doc, y, 'Total Term Declarations', auditPack.declarations?.length || 0);
      y = addKeyValue(doc, y, 'Total Employer Acknowledgements', auditPack.acknowledgements?.length || 0);
      y = addKeyValue(doc, y, 'Total Compliance Rules', auditPack.complianceRules?.length || 0);
      y = addKeyValue(doc, y, 'Total Changes Recorded', auditPack.changeHistory?.length || 0);
      y = addKeyValue(doc, y, 'Total Audit Logs', auditPack.allAuditLogs?.length || 0);
      
      y += 30;
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text('This document serves as evidence of compliance with UK right-to-work regulations.', 50, y, {
           width: 500,
           lineGap: 5
         });
      
      y += 40;
      doc.fontSize(9)
         .fillColor('#ef4444')
         .text('DISCLAIMER:', 50, y, { bold: true });
      
      y += 15;
      doc.fontSize(8)
         .fillColor('#6b7280')
         .text(auditPack.disclaimer, 50, y, {
           width: 500,
           lineGap: 3
         });
      
      // Footer on all pages:
      const pageRange = doc.bufferedPageRange();
      const startPage = pageRange.start;
      const totalPages = pageRange.count;
      for (let i = startPage; i < startPage + totalPages; i++) {
        doc.switchToPage(i);
        const pageNumber = i - startPage + 1;
        doc.fontSize(8)
           .fillColor('#9ca3af')
           .text(
             `Page ${pageNumber} of ${totalPages} | Generated ${formatDate(auditPack.exportDate)}`,
             50,
             doc.page.height - 30,
             { align: 'center', width: 500 }
           );
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate Term Letter PDF for Students
// A professional letter that students can share with employers:
export async function generateTermLetterPDF(student, terms) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      let y = 50;
      
      // Header:
      doc.fontSize(20)
         .fillColor('#1f2937')
         .text('ISC Audit — International Student Compliance Audit', 50, y, { align: 'center' });
      
      y += 30;
      doc.fontSize(16)
         .fillColor('#8b5cf6')
         .text('Academic Term Dates Letter', 50, y, { align: 'center' });
      
      y += 40;
      
      // Date:
      const today = new Date();
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text(`Date: ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 50, y);
      
      y += 30;
      
      // Letter body:
      doc.fontSize(11)
         .fillColor('#1f2937')
         .text('To Whom It May Concern,', 50, y);
      
      y += 30;
      
      // Student information paragraph:
      const studentName = student.fullName || student.user?.email || 'Student';
      const universityName = student.universityName || 'University';
      const universityId = student.universityId || 'N/A';
      
      doc.fontSize(10)
         .fillColor('#1f2937')
         .text(
           `This letter confirms the academic term dates for ${studentName} (University ID: ${universityId}) ` +
           `studying at ${universityName}. The following term dates have been declared and confirmed:`,
           50, y, {
             width: 500,
             lineGap: 5,
             align: 'left'
           }
         );
      
      y += 50;
      
      // Terms table header:
      doc.fontSize(10)
         .fillColor('#1f2937')
         .text('Academic Term Dates:', 50, y, { bold: true });
      
      y += 25;
      
      // Filter to only include confirmed terms (safety check - should already be filtered at endpoint level):
      const confirmedTerms = terms.filter(term => term.confirmedAt !== null && term.confirmedAt !== undefined);
      
      if (confirmedTerms.length === 0) {
        // If no confirmed terms, add a message:
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No confirmed term dates available.', 50, y);
        doc.end();
        return;
      }
      
      // Group terms by academic year:
      const groupedTerms = {};
      const noYearTerms = [];
      
      confirmedTerms.forEach(term => {
        if (term.academicYear) {
          if (!groupedTerms[term.academicYear]) {
            groupedTerms[term.academicYear] = [];
          }
          groupedTerms[term.academicYear].push(term);
        } else {
          noYearTerms.push(term);
        }
      });
      
      // Sort academic years (newest first)
      const sortedYears = Object.keys(groupedTerms).sort((a, b) => {
        const aYear = a.length > 5 ? parseInt(a.split('/')[0]) : 2000 + parseInt(a.split('/')[0]);
        const bYear = b.length > 5 ? parseInt(b.split('/')[0]) : 2000 + parseInt(b.split('/')[0]);
        return bYear - aYear;
      });
      
      // Display terms grouped by academic year
      sortedYears.forEach(year => {
        if (y > 650) {
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(10)
           .fillColor('#8b5cf6')
           .text(`Academic Year ${year}:`, 50, y, { bold: true });
        
        y += 20;
        
        groupedTerms[year]
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
          .forEach(term => {
            if (y > 700) {
              doc.addPage();
              y = 50;
            }
            
            const startDate = new Date(term.startDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            const endDate = new Date(term.endDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            
            doc.fontSize(9)
               .fillColor('#1f2937')
               .text(`• ${term.name} Term: ${startDate} to ${endDate}`, 70, y);
            
            y += 18;
          });
        
        y += 10;
      });
      
      // Display terms without academic year:
      if (noYearTerms.length > 0) {
        if (y > 650) {
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(10)
           .fillColor('#8b5cf6')
           .text('Other Terms:', 50, y, { bold: true });
        
        y += 20;
        
        noYearTerms
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
          .forEach(term => {
            if (y > 700) {
              doc.addPage();
              y = 50;
            }
            
            const startDate = new Date(term.startDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            const endDate = new Date(term.endDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            
            doc.fontSize(9)
               .fillColor('#1f2937')
               .text(`• ${term.name} Term: ${startDate} to ${endDate}`, 70, y);
            
            y += 18;
          });
      }
      
      y += 30;
      
      // Important notice
      if (y > 650) {
        doc.addPage();
        y = 50;
      }
      
      doc.fontSize(10)
         .fillColor('#ef4444')
         .text('Important Information for Employers:', 50, y, { bold: true });
      
      y += 20;
      
      doc.fontSize(9)
         .fillColor('#1f2937')
         .text(
           'During term time, international students on a Student visa are legally restricted to working a maximum of ' +
           '20 hours per week (or 10 hours per week for courses below degree level). Outside of term time, students ' +
           'may work full-time. Please ensure that work schedules comply with these regulations.',
           50, y, {
             width: 500,
             lineGap: 5,
             align: 'left'
           }
         );
      
      y += 50;
      
      // Closing:
      doc.fontSize(10)
         .fillColor('#1f2937')
         .text('This letter is generated by ISC Audit and serves as documentation of the student\'s declared academic term dates.', 50, y, {
           width: 500,
           lineGap: 5,
           align: 'left'
         });
      
      y += 40;
      
      doc.fontSize(10)
         .fillColor('#1f2937')
         .text('Yours sincerely,', 50, y);
      
      y += 30;
      
      doc.fontSize(10)
         .fillColor('#1f2937')
         .text('ISC Audit System', 50, y);
      
      y += 20;
      
      doc.fontSize(9)
         .fillColor('#6b7280')
         .text('International Student Compliance Audit', 50, y);
      
      // Footer on all pages
      const pageRange = doc.bufferedPageRange();
      const startPage = pageRange.start;
      const totalPages = pageRange.count;
      for (let i = startPage; i < startPage + totalPages; i++) {
        doc.switchToPage(i);
        const pageNumber = i - startPage + 1;
        doc.fontSize(8)
           .fillColor('#9ca3af')
           .text(
             `Page ${pageNumber} of ${totalPages} | Generated ${today.toLocaleDateString('en-GB')}`,
             50,
             doc.page.height - 30,
             { align: 'center', width: 500 }
           );
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate Employer Relationship Audit Pack PDF:
export async function generateRelationshipAuditPackPDF(auditPack) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      let y = 50;
      
      // Cover Page:
      y = addHeader(doc, 'ISC Audit — International Student Compliance Audit', 'Employer-Student Relationship Audit Pack');
      
      y += 20;
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('COMPLIANCE EVIDENCE DOCUMENT', 50, y, { align: 'center' });
      
      y += 30;
      doc.fontSize(12)
         .fillColor('#6b7280')
         .text(`Generated: ${formatDate(auditPack.exportDate)}`, 50, y, { align: 'center' });
      
      y += 20;
      doc.fontSize(11)
         .fillColor('#1f2937')
         .text(`Student: ${auditPack.identity?.studentUniversityId || 'N/A'}`, 50, y, { align: 'center' });
      
      y += 20;
      doc.fontSize(10)
         .fillColor('#ef4444')
         .text('IMPORTANT DISCLAIMER', 50, y, { align: 'center', bold: true });
      
      y += 15;
      doc.fontSize(9)
         .fillColor('#6b7280')
         .text(auditPack.disclaimer, 50, y, { 
           align: 'left',
           width: 500,
           lineGap: 5
         });
      
      // New Page - Layer 1: Identity:
      doc.addPage();
      y = addHeader(doc, 'Audit Trail Report', `Relationship ID: ${auditPack.relationship?.id || 'N/A'}`);
      
      y = addSectionTitle(doc, y, 'Identity & Context', 1);
      
      y += 10;
      y = addKeyValue(doc, y, 'Student University ID', auditPack.identity?.studentUniversityId || 'N/A');
      y = addKeyValue(doc, y, 'Visa Type', auditPack.identity?.visaType || 'N/A');
      y = addKeyValue(doc, y, 'Course End Date', formatDate(auditPack.identity?.courseEndDate));
      y = addKeyValue(doc, y, 'Employer ID', auditPack.identity?.employerId || 'N/A');
      y = addKeyValue(doc, y, 'Relationship Status', auditPack.relationship?.status || 'N/A');
      y = addKeyValue(doc, y, 'Linked At', formatDate(auditPack.relationship?.linkedAt));
      
      // New Page - Layer 2: Student Declarations:
      doc.addPage();
      y = addHeader(doc, 'Student Term Declarations', 'Student-Provided Academic Term Information');
      
      y = addSectionTitle(doc, y, 'Student Term Declarations', 2);
      
      if (auditPack.studentDeclarations && auditPack.studentDeclarations.length > 0) {
        auditPack.studentDeclarations.forEach((decl, idx) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(12)
             .fillColor('#1f2937')
             .text(`${decl.term.name} Term - ${decl.term.academicYear}`, 50, y, { bold: true });
          
          y += 20;
          y = addKeyValue(doc, y, 'Start Date', formatDate(decl.term.startDate));
          y = addKeyValue(doc, y, 'End Date', formatDate(decl.term.endDate));
          y = addKeyValue(doc, y, 'Declared', formatDate(decl.declaredAt));
          y = addKeyValue(doc, y, 'Confirmed', decl.confirmedAt ? formatDate(decl.confirmedAt) : 'Pending');
          
          y += 20;
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No student declarations available.', 50, y);
      }
      
      // New Page - Layer 3: Employer Acknowledgement:
      doc.addPage();
      y = addHeader(doc, 'Employer Acknowledgement', 'Employer Confirmation of Student Declarations');
      
      y = addSectionTitle(doc, y, 'Employer Acknowledgement', 3);
      
      if (auditPack.employerAcknowledgement) {
        y += 10;
        y = addKeyValue(doc, y, 'Acknowledged At', formatDate(auditPack.employerAcknowledgement.acknowledgedAt));
        y = addKeyValue(doc, y, 'Acknowledged By', auditPack.employerAcknowledgement.acknowledgedBy || 'N/A');
        
        if (auditPack.employerAcknowledgement.acknowledgementText) {
          y += 10;
          doc.fontSize(9)
             .fillColor('#6b7280')
             .text('Employer Statement:', 50, y);
          y += 15;
          doc.fontSize(9)
             .fillColor('#1f2937')
             .text(`"${auditPack.employerAcknowledgement.acknowledgementText}"`, 60, y, { 
               width: 480,
               lineGap: 3
             });
        }
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No acknowledgement recorded yet.', 50, y);
      }
      
      // New Page - Layer 4: Compliance Rules:
      doc.addPage();
      y = addHeader(doc, 'Compliance Rules', 'System-Generated Work Hour Rules');
      
      y = addSectionTitle(doc, y, 'System-Generated Compliance Rules', 4);
      
      if (auditPack.complianceRules && auditPack.complianceRules.length > 0) {
        auditPack.complianceRules.forEach((rule, idx) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(11)
             .fillColor('#1f2937')
             .text(rule.action || 'Compliance Rule', 50, y, { bold: true });
          
          y += 20;
          y = addKeyValue(doc, y, 'Generated At', formatDate(rule.createdAt));
          
          if (rule.complianceRule) {
            y += 10;
            y = addKeyValue(doc, y, 'Rule Applied', rule.complianceRule.ruleApplied || 'N/A');
            y = addKeyValue(doc, y, 'Allowed Hours', `${rule.complianceRule.allowedWeeklyHours || 'N/A'}h/week`);
          }
          
          y += 20;
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No compliance rules generated yet.', 50, y);
      }
      
      // New Page - Layer 5: Change History:
      doc.addPage();
      y = addHeader(doc, 'Change History', 'Record of All Modifications');
      
      y = addSectionTitle(doc, y, 'Change History', 5);
      
      if (auditPack.changeHistory && auditPack.changeHistory.length > 0) {
        auditPack.changeHistory.forEach((change, idx) => {
          if (y > 650) {
            doc.addPage();
            y = 50;
          }
          
          y += 10;
          doc.fontSize(11)
             .fillColor('#1f2937')
             .text(change.action || 'Change Record', 50, y, { bold: true });
          
          y += 20;
          y = addKeyValue(doc, y, 'Changed At', formatDate(change.createdAt));
          y = addKeyValue(doc, y, 'Changed By', change.performedBy || 'N/A');
          
          if (change.changeHistory) {
            y += 10;
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text('Before:', 50, y);
            y += 15;
            doc.fontSize(8)
               .fillColor('#1f2937')
               .text(JSON.stringify(change.changeHistory.before, null, 2), 60, y, { 
                 width: 480,
                 lineGap: 2
               });
            
            const beforeHeight = doc.heightOfString(JSON.stringify(change.changeHistory.before, null, 2), { width: 480 });
            y += beforeHeight + 15;
            
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text('After:', 50, y);
            y += 15;
            doc.fontSize(8)
               .fillColor('#1f2937')
               .text(JSON.stringify(change.changeHistory.after, null, 2), 60, y, { 
                 width: 480,
                 lineGap: 2
               });
            
            const afterHeight = doc.heightOfString(JSON.stringify(change.changeHistory.after, null, 2), { width: 480 });
            y += afterHeight + 20;
          }
        });
      } else {
        y += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text('No changes recorded yet.', 50, y);
      }
      
      // Final Page - Summary:
      doc.addPage();
      y = addHeader(doc, 'Audit Trail Summary', 'Complete Record Summary');
      
      y += 20;
      doc.fontSize(12)
         .fillColor('#1f2937')
         .text('Summary Statistics', 50, y, { bold: true });
      
      y += 30;
      y = addKeyValue(doc, y, 'Total Student Declarations', auditPack.studentDeclarations?.length || 0);
      y = addKeyValue(doc, y, 'Employer Acknowledgement', auditPack.employerAcknowledgement ? 'Yes' : 'No');
      y = addKeyValue(doc, y, 'Total Compliance Rules', auditPack.complianceRules?.length || 0);
      y = addKeyValue(doc, y, 'Total Changes Recorded', auditPack.changeHistory?.length || 0);
      y = addKeyValue(doc, y, 'Total Audit Logs', auditPack.allAuditLogs?.length || 0);
      
      y += 30;
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text('This document serves as evidence of compliance with UK right-to-work regulations.', 50, y, {
           width: 500,
           lineGap: 5
         });
      
      y += 40;
      doc.fontSize(9)
         .fillColor('#ef4444')
         .text('DISCLAIMER:', 50, y, { bold: true });
      
      y += 15;
      doc.fontSize(8)
         .fillColor('#6b7280')
         .text(auditPack.disclaimer, 50, y, {
           width: 500,
           lineGap: 3
         });
      
      // Footer on all pages:
      const pageRange = doc.bufferedPageRange();
      const startPage = pageRange.start;
      const totalPages = pageRange.count;
      for (let i = startPage; i < startPage + totalPages; i++) {
        doc.switchToPage(i);
        const pageNumber = i - startPage + 1;
        doc.fontSize(8)
           .fillColor('#9ca3af')
           .text(
             `Page ${pageNumber} of ${totalPages} | Generated ${formatDate(auditPack.exportDate)}`,
             50,
             doc.page.height - 30,
             { align: 'center', width: 500 }
           );
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
