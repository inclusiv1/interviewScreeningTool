import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InterviewQuestion } from '../types';

/**
 * Exports a collection of flashcards to a PDF file.
 * This version uses a clean text-based approach to ensure readability
 * and handle long content better than simple screenshots.
 */
export const exportCardsToPdf = async (cards: InterviewQuestion[], setName: string = 'Interview Flash Cards') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(26, 43, 73); // #1a2b49 (Method Navy)
  doc.text(setName, margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setTextColor(102, 102, 102);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, y);
  y += 10;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }

    // Card Header (Topic & Number)
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`CARD ${i + 1} | TOPIC: ${card.topic.toUpperCase()}`, margin, y);
    y += 7;

    // Question
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'bold');
    const questionLines = doc.splitTextToSize(`Q: ${card.question}`, contentWidth);
    doc.text(questionLines, margin, y);
    y += (questionLines.length * 7) + 5;

    // Answer
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(85, 85, 85);
    
    // Check if it's a conversation style card
    const isConversation = card.answer.toLowerCase().includes('interviewer:') || card.answer.toLowerCase().includes('candidate:');
    
    if (isConversation) {
      // Clean up markdown/code blocks
      let t = card.answer.trim();
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        t = t.slice(1, -1);
      }
      t = t.replace(/```(?:json)?\n?|```/g, '').trim();

      const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const re = /^\s*"?(interviewer|candidate)\s*[:\-–]\s*"?/i;
      
      doc.text('A: (Conversation)', margin, y);
      y += 7;

      for (const line of lines) {
        const m = line.match(re);
        if (m) {
          const roleRaw = m[1].toLowerCase();
          const role = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);
          const textPart = line.replace(re, '').trim().replace(/^"|"$/g, '');
          
          // Print Role in Bold
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(role === 'Interviewer' ? 43 : 47, role === 'Interviewer' ? 108 : 133, role === 'Interviewer' ? 176 : 90); // Colors matched to badges
          doc.text(`${role}:`, margin + 5, y);
          
          // Print text next to it
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(85, 85, 85);
          const turnLines = doc.splitTextToSize(textPart, contentWidth - 35);
          doc.text(turnLines, margin + 35, y);
          
          const lineHeight = Math.max(7, turnLines.length * 6);
          y += lineHeight + 2;
        } else {
          // Fallback for lines that don't match the role regex
          const otherLines = doc.splitTextToSize(line, contentWidth - 10);
          doc.text(otherLines, margin + 5, y);
          y += (otherLines.length * 6) + 2;
        }

        // Check for page overflow inside conversation
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = margin;
        }
      }
      y += 5;
    } else {
      // Standard Answer
      const cleanAnswer = card.answer.replace(/```\w*\n|```/g, '');
      const answerLines = doc.splitTextToSize(`A: ${cleanAnswer}`, contentWidth);
      
      // Check if answer fits on current page
      if (y + (answerLines.length * 6) > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
      
      doc.text(answerLines, margin, y);
      y += (answerLines.length * 6) + 10;
    }

    // Coding Example
    if (card.codingExample) {
      doc.setFontSize(11);
      doc.setFont('courier', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.setFillColor(245, 245, 245);
      
      const codeLines = doc.splitTextToSize(`Coding Example:\n${card.codingExample.replace(/```\w*\n|```/g, '')}`, contentWidth - 10);
      const codeHeight = (codeLines.length * 5) + 10;
      
      if (y + codeHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
      
      doc.rect(margin - 2, y - 5, contentWidth + 4, codeHeight, 'F');
      doc.text(codeLines, margin + 2, y);
      y += codeHeight + 10;
    }

    // Challenges
    if (card.challenges) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 0, 0); // Slightly reddish for challenges
      doc.setFillColor(255, 240, 240);
      
      const challengeLines = doc.splitTextToSize(`Challenges & Pitfalls:\n${card.challenges.replace(/```\w*\n|```/g, '')}`, contentWidth - 10);
      const challengeHeight = (challengeLines.length * 6) + 10;
      
      if (y + challengeHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
      
      doc.rect(margin - 2, y - 5, contentWidth + 4, challengeHeight, 'F');
      doc.text(challengeLines, margin + 2, y);
      y += challengeHeight + 10;
    }

    // Note if present
    if (card.note) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.setFillColor(252, 243, 207); // Light yellow
      
      const noteLines = doc.splitTextToSize(`Note: ${card.note}`, contentWidth - 10);
      const noteHeight = (noteLines.length * 6) + 10;
      
      if (y + noteHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
      
      doc.rect(margin - 2, y - 5, contentWidth + 4, noteHeight, 'F');
      doc.text(noteLines, margin + 2, y);
      y += noteHeight + 10;
    }

    // Separator between cards
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    y += 10;
  }

  doc.save(`${setName.replace(/\s+/g, '_').toLowerCase()}_export.pdf`);
};

/**
 * Alternative export that tries to capture the current DOM state of a specific element.
 * Useful if we want to preserve exact styling, though more prone to layout issues.
 */
export const exportElementToPdf = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
};
