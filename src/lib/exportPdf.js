import jsPDF from 'jspdf';

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function exportDiaryToPdf(diaryName, entries = [], dateFrom = null, dateTo = null) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Filter entries by date range if specified
  let filteredEntries = [...(entries || [])].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateA - dateB;
  });

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    filteredEntries = filteredEntries.filter((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt || 0);
      return d >= fromDate;
    });
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredEntries = filteredEntries.filter((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt || 0);
      return d <= toDate;
    });
  }

  const safeDiaryName = diaryName || 'My Diary';

  // Title page
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(44, 36, 22); // ink color
  pdf.text(safeDiaryName, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(107, 93, 77); // ink-muted
  pdf.text('Antarang — a diary as close as your own heart', pageWidth / 2, pageHeight / 2, { align: 'center' });
  pdf.text(`${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

  pdf.setFontSize(9);
  pdf.text('Developed with love by Arpit Singh Yadav', pageWidth / 2, pageHeight - margin, { align: 'center' });

  // Entry pages
  for (const entry of filteredEntries) {
    pdf.addPage();
    yPosition = margin;

    // Date header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(197, 161, 78); // gold
    pdf.text(formatDate(entry.createdAt) || 'Undated Entry', margin, yPosition);
    yPosition += 8;

    // Mood tag if present
    if (entry.mood) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.setTextColor(107, 93, 77);
      pdf.text(`Mood: ${entry.mood}`, margin, yPosition);
      yPosition += 8;
    }

    // Divider line
    pdf.setDrawColor(197, 161, 78);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Entry content
    const plainText = stripHtml(entry.content || '');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(44, 36, 22);

    const lines = pdf.splitTextToSize(plainText || '(Empty entry)', maxWidth);
    for (const line of lines) {
      if (yPosition > pageHeight - margin - 10) {
        // Footer before page break
        pdf.setFontSize(8);
        pdf.setTextColor(107, 93, 77);
        pdf.text(safeDiaryName, pageWidth / 2, pageHeight - 10, { align: 'center' });

        pdf.addPage();
        yPosition = margin;
        pdf.setFontSize(11);
        pdf.setTextColor(44, 36, 22);
      }
      pdf.text(line, margin, yPosition);
      yPosition += 6;
    }

    // Page footer
    pdf.setFontSize(8);
    pdf.setTextColor(107, 93, 77);
    pdf.text(safeDiaryName, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save
  const fileName = `${safeDiaryName.replace(/\s+/g, '_')}_diary.pdf`;
  pdf.save(fileName);
  return { success: true, count: filteredEntries.length, fileName };
}

export default exportDiaryToPdf;
